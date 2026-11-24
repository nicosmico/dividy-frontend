import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Page,
  type TestInfo,
} from '@playwright/test';

import { openTab } from './navigation';
import { skipViewerSheet } from './viewer';

declare global {
  interface Window {
    __shared?: { title?: string; text?: string };
  }
}

/** Makes `navigator.share` record what it receives (no OS share sheet in a test). */
async function stubShare(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { title?: string; text?: string }) => {
        window.__shared = data;
      },
    });
  });
}

/** A new browser context without any data, shaped like the project (desktop or phone). */
async function freshContext(
  browser: Browser,
  testInfo: TestInfo
): Promise<BrowserContext> {
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } =
    testInfo.project.use;
  return browser.newContext({
    viewport,
    userAgent,
    deviceScaleFactor,
    isMobile,
    hasTouch,
  });
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function createGroupIn(
  page: Page,
  name: string,
  members: string[],
  currencyLabel: string
) {
  await page.goto('/groups/new');
  await page.getByLabel('Nombre del grupo').fill(name);
  await page.getByRole('combobox', { name: 'Moneda' }).click();
  await page.getByRole('option', { name: currencyLabel }).click();
  const memberInput = page.getByRole('textbox', { name: 'Miembros' });
  for (const member of members) {
    await memberInput.fill(member);
    await memberInput.press('Enter');
  }
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  await skipViewerSheet(page);
  await expect(page).toHaveURL(/\/groups\/[^/]+\/expenses$/);
}

test('grupo en dólares: centavos, división por montos que cuadra, saldos exactos, link y moneda bloqueada', async ({
  page,
  browser,
}, testInfo) => {
  await stubShare(page);
  await createGroupIn(
    page,
    'Viaje a Miami',
    ['Ana', 'Beto'],
    'Dólar estadounidense (USD)'
  );

  // --- A first expense with cents, split equally: 10,01 → 5,01 / 5,00.
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  let dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  const amount = dialog.getByLabel('Monto', { exact: true });
  await expect(
    amount.locator('xpath=..').locator('span[aria-hidden="true"]')
  ).toHaveText('US$');
  await dialog.getByLabel('Descripción').fill('Cena');
  await amount.fill('10,01');
  await expect(dialog.getByText('Por redondeo, a Ana le toca')).toContainText(
    '0,01 más'
  );
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('US$10,01').first()).toBeVisible();

  // --- A second one paid by Beto, split by amounts with cents that add up.
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog.getByLabel('Descripción').fill('Taxi');
  await dialog.getByLabel('Monto', { exact: true }).fill('20');
  await dialog.getByLabel('Pagado por').click();
  await page.getByRole('option', { name: 'Beto' }).click();
  await dialog.getByRole('radio', { name: 'Montos' }).click();
  // A first try that does not add up says by how many cents.
  await dialog.getByLabel('Monto de Ana').fill('12,33');
  await dialog.getByLabel('Monto de Beto').fill('7,66');
  await expect(dialog.locator('[aria-live="polite"]')).toContainText(
    'faltan US$0,01'
  );
  await dialog.getByLabel('Monto de Beto').fill('7,67');
  await expect(dialog.locator('[aria-live="polite"]')).toContainText('Cuadra');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('US$30,01').first()).toBeVisible();

  // --- Saldos, to the cent: Ana paid 10,01 and owes 5,01 + 12,33 = 17,34;
  // Beto paid 20,00 and owes 5,00 + 7,67 = 12,67. So Ana owes Beto 7,33.
  await openTab(page, 'Saldos');
  const main = page.getByRole('main');
  await expect(main.getByText('Pendiente: US$7,33 por saldar')).toBeVisible();
  await expect(main.getByText('Le deben US$7,33').first()).toBeVisible();
  await expect(main.getByText('Debe US$7,33').first()).toBeVisible();

  // --- The currency cannot change anymore: disabled, with the reason.
  await page.getByRole('button', { name: 'Opciones del grupo' }).click();
  await page.getByRole('menuitem', { name: /Editar grupo/ }).click();
  const edit = page.getByRole('dialog', { name: 'Editar grupo' });
  await expect(edit.getByRole('combobox', { name: 'Moneda' })).toBeDisabled();
  await expect(edit.getByRole('combobox', { name: 'Moneda' })).toContainText(
    'Dólar estadounidense (USD)'
  );
  await expect(
    edit.getByText(
      'Para cambiar la moneda, el grupo no puede tener gastos ni pagos.'
    )
  ).toBeVisible();
  await expectNoHorizontalScroll(page);
  await edit.getByRole('button', { name: 'Cancelar' }).click();
  await expect(edit).toBeHidden();

  // --- Mis grupos: the card says the currency, discreetly.
  await page.goto('/');
  const card = page.getByRole('link', { name: /Viaje a Miami/ });
  await expect(card).toContainText('US$30,01');
  await expect(card.getByText('USD', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/groups\/[^/]+\/balances$/);

  // --- Share: the summary names the currency once and the link carries it.
  await page.evaluate(() => {
    window.__shared = undefined;
  });
  await page.getByRole('button', { name: 'Compartir resumen' }).click();
  await expect
    .poll(() => page.evaluate(() => window.__shared?.text))
    .toBeTruthy();
  const text = (await page.evaluate(() => window.__shared?.text)) as string;
  expect(text.split('\n')[0]).toBe(
    '*Viaje a Miami* · en dólares estadounidenses (USD)'
  );
  expect(text).toContain('US$20,00');
  const link = /Ver el detalle: (\S+)$/.exec(text)?.[1] as string;
  expect(link).toMatch(/\/shared#v3\./);

  // --- Someone else with a brand new browser opens it: same currency, same numbers.
  const context = await freshContext(browser, testInfo);
  const other = await context.newPage();
  await other.goto(link);
  await skipViewerSheet(other);
  await expect(
    other.getByRole('heading', { name: 'Viaje a Miami', level: 1 })
  ).toBeVisible();
  await expect(other.getByText('US$30,01').first()).toBeVisible();
  await expect(other.getByText('US$20,00').first()).toBeVisible();
  await openTab(other, 'Saldos');
  await expect(
    other.getByRole('main').getByText('Pendiente: US$7,33 por saldar')
  ).toBeVisible();
  await expect(other.getByText('Debe US$7,33').first()).toBeVisible();
  await expectNoHorizontalScroll(other);
  await context.close();
});

test('en una moneda sin decimales, escribir decimales dice qué hacer; en dólares, máximo 2', async ({
  page,
}) => {
  await createGroupIn(page, 'Casa', ['Ana', 'Beto'], 'Peso chileno (CLP)');
  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await dialog.getByLabel('Descripción').fill('Pan');
  await dialog.getByLabel('Monto', { exact: true }).fill('1000,5');
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(
    dialog.getByText('El peso chileno no usa decimales.')
  ).toBeVisible();
  await dialog.getByLabel('Monto', { exact: true }).fill('1000');
  await expect(dialog.getByLabel('Monto', { exact: true })).toHaveValue(
    '1.000'
  );
  await dialog.getByRole('button', { name: 'Guardar' }).click();
  await expect(dialog).toBeHidden();

  // The currency of a group without expenses can still be changed.
  await createGroupIn(page, 'Euros', ['Ana', 'Beto'], 'Euro (EUR)');
  await page.getByRole('button', { name: 'Opciones del grupo' }).click();
  await page.getByRole('menuitem', { name: /Editar grupo/ }).click();
  const edit = page.getByRole('dialog', { name: 'Editar grupo' });
  await expect(edit.getByRole('combobox', { name: 'Moneda' })).toBeEnabled();
  await edit.getByRole('combobox', { name: 'Moneda' }).click();
  await page
    .getByRole('option', { name: 'Dólar estadounidense (USD)' })
    .click();
  await edit.getByRole('button', { name: 'Guardar' }).click();
  await expect(edit).toBeHidden();

  await page.getByRole('button', { name: 'Agregar gasto' }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo gasto' });
  await form.getByLabel('Descripción').fill('Pan');
  await form.getByLabel('Monto', { exact: true }).fill('10,555');
  await form.getByRole('button', { name: 'Guardar' }).click();
  await expect(
    form.getByText('El dólar estadounidense admite hasta 2 decimales.')
  ).toBeVisible();
  await form.getByLabel('Monto', { exact: true }).fill('10,5');
  await form.getByLabel('Monto', { exact: true }).blur();
  await expect(form.getByLabel('Monto', { exact: true })).toHaveValue('10,50');
});
