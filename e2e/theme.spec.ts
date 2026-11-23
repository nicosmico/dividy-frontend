import { expect, test, type Page } from '@playwright/test';

const DARK_BACKGROUND = 'rgb(11, 23, 48)';
const LIGHT_BACKGROUND = 'rgb(244, 247, 242)';

/**
 * Records what the page looks like at two moments of every load: when <body>
 * is created (only the inline script in index.html has run) and when React
 * puts its first element in #root. Neither may show the wrong theme.
 */
async function recordFirstPaint(page: Page) {
  await page.addInitScript(() => {
    const record = {
      atBody: null as string | null,
      atMount: null as { dark: boolean; background: string } | null,
    };
    (window as unknown as { __firstPaint: typeof record }).__firstPaint =
      record;
    new MutationObserver((_, observer) => {
      if (document.body && record.atBody === null) {
        record.atBody = document.documentElement.className;
      }
      const mount = document.getElementById('root');
      if (mount?.firstElementChild) {
        record.atMount = {
          dark: document.documentElement.classList.contains('dark'),
          background: getComputedStyle(document.body).backgroundColor,
        };
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
}

function firstPaint(page: Page) {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __firstPaint: {
            atBody: string | null;
            atMount: { dark: boolean; background: string } | null;
          };
        }
      ).__firstPaint
  );
}

const isDark = (page: Page) =>
  page.evaluate(() => document.documentElement.classList.contains('dark'));

async function chooseTheme(page: Page, name: 'Sistema' | 'Claro' | 'Oscuro') {
  await page.getByRole('button', { name: 'Tema de colores' }).click();
  await page.getByRole('menuitemradio', { name }).click();
}

test('elegir "Oscuro" se recuerda al recargar y no hay destello', async ({
  page,
}) => {
  // The system is light: only the saved choice can make the page dark.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Bienvenido a Dividy' })
  ).toBeVisible();
  expect(await isDark(page)).toBe(false);

  await chooseTheme(page, 'Oscuro');
  await expect.poll(() => isDark(page)).toBe(true);

  await recordFirstPaint(page);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Bienvenido a Dividy' })
  ).toBeVisible();

  expect(await isDark(page)).toBe(true);
  const paint = await firstPaint(page);
  // The inline script ran before the body existed...
  expect(paint.atBody).toContain('dark');
  // ...so when React mounted the page was already dark, not light.
  expect(paint.atMount).toEqual({ dark: true, background: DARK_BACKGROUND });

  // The menu shows the saved choice.
  await page.getByRole('button', { name: 'Tema de colores' }).click();
  await expect(
    page.getByRole('menuitemradio', { name: 'Oscuro' })
  ).toBeChecked();
});

test('con el sistema oscuro y sin elección, la primera pintura ya es oscura', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await recordFirstPaint(page);
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Bienvenido a Dividy' })
  ).toBeVisible();
  const paint = await firstPaint(page);
  expect(paint.atBody).toContain('dark');
  expect(paint.atMount).toEqual({ dark: true, background: DARK_BACKGROUND });
});

test('"Sistema" sigue al sistema en vivo y "Claro" lo ignora', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Bienvenido a Dividy' })
  ).toBeVisible();
  const background = () =>
    page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await background()).toBe(LIGHT_BACKGROUND);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => isDark(page)).toBe(true);
  expect(await background()).toBe(DARK_BACKGROUND);

  await chooseTheme(page, 'Claro');
  await expect.poll(() => isDark(page)).toBe(false);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await isDark(page)).toBe(false);

  await chooseTheme(page, 'Sistema');
  await expect.poll(() => isDark(page)).toBe(true);
});

test('el tema también cambia el color de la barra del navegador', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const colors = () =>
    page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLMetaElement>(
          'meta[name="theme-color"]'
        ),
      ]
        .map((meta) => meta.content)
        .join(',')
    );
  expect(await colors()).toBe('#f4f7f2,#0b1730');
  await chooseTheme(page, 'Oscuro');
  await expect.poll(colors).toBe('#0b1730,#0b1730');
});
