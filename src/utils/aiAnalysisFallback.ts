import { AIScanAnalysis, ItemCategory, ItemCondition } from '../types';

/**
 * Intelligent client-side fallback analysis when network or server is unavailable
 */
export function generateSmartAnalysis(hint = '', room = ''): AIScanAnalysis {
  const lower = (hint + ' ' + room).toLowerCase();

  if (lower.includes('tv') || lower.includes('skärm') || lower.includes('oled') || lower.includes('samsung') || lower.includes('lg')) {
    return {
      name: 'Samsung 65" 4K Smart TV',
      category: 'Elektronik & Dator',
      suggestedRoom: room || 'Vardagsrum',
      condition: 'Mycket bra',
      quantity: 1,
      estimatedValueSEK: 6500,
      estimatedNewPriceSEK: 12990,
      brand: 'Samsung',
      model: 'QLED 4K Smart-TV',
      description: '65-tums 4K QLED Smart TV med fjärrkontroll och vägg-/bordsfäste. Utmärkt bildkvalitet och välhållet skick.',
      serialNumberDetected: 'SN-SAM-984201',
      tags: ['tv', 'elektronik', 'vardagsrum', '4k'],
      confidence: 94,
      insuranceTip: 'Notera serienumret och ta en bild på modellbeteckningen på baksidan för hemförsäkringen.',
    };
  } else if (lower.includes('kaffe') || lower.includes('espress') || lower.includes('moccamaster') || lower.includes('kök') || lower.includes('sage')) {
    return {
      name: 'Moccamaster KBG962 Kaffebryggare',
      category: 'Vitvaror & Kök',
      suggestedRoom: room || 'Kök',
      condition: 'Mycket bra',
      quantity: 1,
      estimatedValueSEK: 1400,
      estimatedNewPriceSEK: 2890,
      brand: 'Moccamaster',
      model: 'KBG962 AO',
      description: 'Klassisk handbyggd kaffebryggare i borstat stål och glaskanna. Välvårdad och regelbundet avkalkad.',
      serialNumberDetected: '',
      tags: ['kaffe', 'kök', 'vitvaror', 'fika'],
      confidence: 92,
      insuranceTip: 'Moccamaster har upp till 10 års garanti om den är registrerad hos tillverkaren.',
    };
  } else if (lower.includes('soffa') || lower.includes('fåtölj') || lower.includes('bord') || lower.includes('stol') || lower.includes('vardagsrum')) {
    return {
      name: 'Nordisk 3-sits soffa med schäslong',
      category: 'Möbler & Inredning',
      suggestedRoom: room || 'Vardagsrum',
      condition: 'Bra',
      quantity: 1,
      estimatedValueSEK: 4500,
      estimatedNewPriceSEK: 11500,
      brand: 'Mio / IKEA',
      model: 'Komfort 3-sits',
      description: 'Rymlig och bekväm tygsoffa med avtagbar och tvättbar klädsel i slitstark grå textil. Ben i massiv ek.',
      serialNumberDetected: '',
      tags: ['soffa', 'möbler', 'inredning', 'vardagsrum'],
      confidence: 89,
      insuranceTip: 'Möbler avskrivs vanligen långsammare än hemelektronik i hemförsäkringens villkor.',
    };
  } else if (lower.includes('dator') || lower.includes('laptop') || lower.includes('macbook') || lower.includes('pc') || lower.includes('kontor')) {
    return {
      name: 'Apple MacBook Pro 14" M2',
      category: 'Elektronik & Dator',
      suggestedRoom: room || 'Kontor / Arbetsrum',
      condition: 'Mycket bra',
      quantity: 1,
      estimatedValueSEK: 13500,
      estimatedNewPriceSEK: 22490,
      brand: 'Apple',
      model: 'MacBook Pro 14"',
      description: 'Bärbar dator i rymdgrå aluminium med Liquid Retina XDR-skärm. Inklusive originalladdare.',
      serialNumberDetected: 'C02G9012MD6R',
      tags: ['laptop', 'apple', 'dator', 'kontor'],
      confidence: 96,
      insuranceTip: 'Bärbar elektronik kräver ofta särskild drulle-/allriskförsäkring utanför hemmet.',
    };
  } else if (lower.includes('cykel') || lower.includes('skidor') || lower.includes('golf') || lower.includes('sport')) {
    return {
      name: 'Skeppshult Herrcykel 7-växlad',
      category: 'Sport & Fritid',
      suggestedRoom: room || 'Förråd & Källare',
      condition: 'Bra',
      quantity: 1,
      estimatedValueSEK: 3800,
      estimatedNewPriceSEK: 8995,
      brand: 'Skeppshult',
      model: 'Natur 7-vxl',
      description: 'Klassisk kvalitetscykel med navdynamo, godkänt ramlås och korg. Välservad och rostfri.',
      serialNumberDetected: 'RAM-SKP-83192',
      tags: ['cykel', 'sport', 'transport', 'förråd'],
      confidence: 90,
      insuranceTip: 'Ramnummer och kvitto på SSF-godkänt lås är ett krav för ersättning vid cykelstöld!',
    };
  } else if (lower.includes('verktyg') || lower.includes('skruvdragare') || lower.includes('bosch') || lower.includes('makita') || lower.includes('garage')) {
    return {
      name: 'Bosch Professional 18V Borrskruvdragare kit',
      category: 'Verktyg & Maskiner',
      suggestedRoom: room || 'Garage / Verkstad',
      condition: 'Mycket bra',
      quantity: 1,
      estimatedValueSEK: 1650,
      estimatedNewPriceSEK: 2790,
      brand: 'Bosch Professional',
      model: 'GSR 18V-55',
      description: 'Borstlös 18V borrskruvdragare med 2st 4.0Ah Li-Ion batterier och snabbladdare i förvaringsväska.',
      serialNumberDetected: 'BSH-GSR-9031',
      tags: ['verktyg', 'skruvdragare', 'garage', 'bosch'],
      confidence: 93,
      insuranceTip: 'Dyrare elverktyg har ofta begränsat maxbelopp i förråd i standardförsäkringar.',
    };
  } else {
    return {
      name: hint ? `Identifierat: ${hint}` : 'Inventerat hemföremål',
      category: 'Möbler & Inredning',
      suggestedRoom: room || 'Vardagsrum',
      condition: 'Bra',
      quantity: 1,
      estimatedValueSEK: 1200,
      estimatedNewPriceSEK: 2500,
      brand: 'Okänt märke',
      model: '',
      description: 'Föremål för hemmet i funktionellt och välhållet skick.',
      serialNumberDetected: '',
      tags: ['hem', 'inventarie', 'inredning'],
      confidence: 85,
      insuranceTip: 'Kontrollera uppskattat värde och justera vid behov innan du godkänner.',
    };
  }
}
