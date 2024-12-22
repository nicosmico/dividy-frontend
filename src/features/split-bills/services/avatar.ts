const baseUrl = 'https://api.dicebear.com/9.x/lorelei/svg';

const buildConfigParams = (config: Record<string, string | null>): string => {
  return Object.entries(config)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
};

const getGenreVariant = (name: string): string | null => {
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('o')) {
    return [
      'variant04',
      'variant05',
      'variant06',
      'variant07',
      'variant08',
      'variant11',
      'variant12',
      'variant20',
      'variant34',
      'variant37',
      'variant39',
      'variant44',
      'variant47',
    ].join(',');
  }
  if (lowerName.endsWith('a')) {
    return [
      'variant10',
      'variant13',
      'variant14',
      'variant15',
      'variant16',
      'variant17',
      'variant18',
      'variant19',
      'variant20',
      'variant21',
      'variant23',
      'variant24',
      'variant26',
      'variant29',
      'variant30',
      'variant31',
      'variant32',
      'variant33',
      'variant35',
      'variant36',
      'variant38',
      'variant40',
      'variant41',
      'variant42',
      'variant45',
      'variant46',
      'variant48',
    ].join(',');
  }
  return null;
};

const getConfig = (name: string): string => {
  const hair = getGenreVariant(name);
  const config = {
    glasses: ['variant01', 'variant04'].join(','),
    glassesProbability: '30',
    hair,
  };
  return buildConfigParams(config);
};

export class Avatar {
  static happy(name: string): string {
    const eyes = ['variant08', 'variant16', 'variant20', 'variant22'].join(',');
    const mouth = [
      'happy01',
      'happy02',
      'happy03',
      'happy04',
      'happy05',
      'happy06',
      'happy07',
      'happy08',
      'happy09',
      'happy10',
      'happy11',
      'happy12',
      'happy13',
      'happy14',
      'happy15',
      'happy16',
    ].join(',');
    return `${baseUrl}?${getConfig(name)}&seed=${name}&eyes=${eyes}&mouth=${mouth}`;
  }

  static sad(name: string): string {
    const eyes = ['variant19', 'variant13', 'variant04'].join(',');
    const mouth = [
      'sad01',
      'sad02',
      'sad03',
      'sad04',
      'sad05',
      'sad06',
      'sad07',
      'sad08',
      'sad09',
    ].join(',');
    return `${baseUrl}?${getConfig(name)}&seed=${name}&eyes=${eyes}&mouth=${mouth}`;
  }
}
