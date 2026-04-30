// 각 게이트의 gold 는 총 골드 (= 일반 + 귀속). boundGold 는 그중 귀속 비중.
// 일반 골드 = gold - boundGold. 더보기 비용(moreGold) 은 귀속에서 우선 차감하고 부족하면 일반에서 차감.
export const raids = [
  {
    name: '성당 3단계',
    level: 1750,
    image: '/wlvuddmltjdekd1.webp',
    gates: [
      { gate: 1, gold: 20000, boundGold: 20000, moreGold: 6400 },
      { gate: 2, gold: 30000, boundGold: 30000, moreGold: 9600 },
    ],
  },
  {
    name: '성당 2단계',
    level: 1720,
    image: '/wlvuddmltjdekd1.webp',
    gates: [
      { gate: 1, gold: 16000, boundGold: 16000, moreGold: 5120 },
      { gate: 2, gold: 24000, boundGold: 24000, moreGold: 7680 },
    ],
  },
  {
    name: '성당 1단계',
    level: 1700,
    image: '/wlvuddmltjdekd1.webp',
    gates: [
      { gate: 1, gold: 13500, boundGold: 13500, moreGold: 4320 },
      { gate: 2, gold: 16500, boundGold: 16500, moreGold: 5280 },
    ],
  },
  {
    name: '세르카 나메',
    level: 1740,
    image: '/cerka.webp',
    gates: [
      { gate: 1, gold: 21000, boundGold: 0, moreGold: 6720 },
      { gate: 2, gold: 33000, boundGold: 0, moreGold: 10560 },
    ],
  },
  {
    name: '세르카 하드',
    level: 1730,
    image: '/cerka.webp',
    gates: [
      { gate: 1, gold: 17500, boundGold: 0, moreGold: 5600 },
      { gate: 2, gold: 26500, boundGold: 0, moreGold: 8480 },
    ],
  },
  {
    name: '세르카 노말',
    level: 1710,
    image: '/cerka.webp',
    gates: [
      { gate: 1, gold: 14000, boundGold: 7000, moreGold: 4480 },
      { gate: 2, gold: 21000, boundGold: 10500, moreGold: 6720 },
    ],
  },
  {
    name: '종막 하드',
    level: 1730,
    image: '/abrelshud.webp',
    gates: [
      { gate: 1, gold: 17000, boundGold: 0, moreGold: 5440 },
      { gate: 2, gold: 35000, boundGold: 0, moreGold: 11200 },
    ],
  },
  {
    name: '종막 노말',
    level: 1710,
    image: '/abrelshud.webp',
    gates: [
      { gate: 1, gold: 14000, boundGold: 7000, moreGold: 4480 },
      { gate: 2, gold: 26000, boundGold: 13000, moreGold: 8320 },
    ],
  },
  {
    name: '4막 하드',
    level: 1720,
    image: '/illiakan.webp',
    gates: [
      { gate: 1, gold: 15000, boundGold: 0, moreGold: 4800 },
      { gate: 2, gold: 27000, boundGold: 0, moreGold: 8640 },
    ],
  },
  {
    name: '4막 노말',
    level: 1700,
    image: '/illiakan.webp',
    gates: [
      { gate: 1, gold: 12500, boundGold: 6250, moreGold: 4000 },
      { gate: 2, gold: 20500, boundGold: 10250, moreGold: 6500 },
    ],
  },
  {
    name: '3막 하드',
    level: 1700,
    image: '/ivory-tower.webp',
    gates: [
      { gate: 1, gold: 5000, boundGold: 2500, moreGold: 1650 },
      { gate: 2, gold: 8000, boundGold: 4000, moreGold: 2640 },
      { gate: 3, gold: 14000, boundGold: 7000, moreGold: 4060 },
    ],
  },
  {
    name: '3막 노말',
    level: 1680,
    image: '/ivory-tower.webp',
    gates: [
      { gate: 1, gold: 4000, boundGold: 2000, moreGold: 1300 },
      { gate: 2, gold: 7000, boundGold: 3500, moreGold: 2350 },
      { gate: 3, gold: 10000, boundGold: 5000, moreGold: 3360 },
    ],
  },
  {
    name: '2막 하드',
    level: 1690,
    image: '/kazeros.webp',
    gates: [
      { gate: 1, gold: 7500, boundGold: 3750, moreGold: 2400 },
      { gate: 2, gold: 15500, boundGold: 7750, moreGold: 5100 },
    ],
  },
  {
    name: '2막 노말',
    level: 1670,
    image: '/kazeros.webp',
    gates: [
      { gate: 1, gold: 5500, boundGold: 2750, moreGold: 1820 },
      { gate: 2, gold: 11000, boundGold: 5500, moreGold: 3720 },
    ],
  },
  {
    name: '1막 하드',
    level: 1680,
    image: '/aegir.webp',
    gates: [
      { gate: 1, gold: 5500, boundGold: 2750, moreGold: 1820 },
      { gate: 2, gold: 12500, boundGold: 6250, moreGold: 4150 },
    ],
  },
  {
    name: '1막 노말',
    level: 1660,
    image: '/aegir.webp',
    gates: [
      { gate: 1, gold: 3500, boundGold: 1750, moreGold: 750 },
      { gate: 2, gold: 8000, boundGold: 4000, moreGold: 1780 },
    ],
  },
  {
    name: '서막',
    level: 1640,
    image: '/echidna.webp',
    gates: [
      { gate: 1, gold: 2200, boundGold: 1100, moreGold: 720 },
      { gate: 2, gold: 5000, boundGold: 2500, moreGold: 1630 },
    ],
  },
  {
    name: '베히모스',
    level: 1640,
    image: '/behemoth.webp',
    gates: [
      { gate: 1, gold: 2200, boundGold: 1100, moreGold: 720 },
      { gate: 2, gold: 5000, boundGold: 2500, moreGold: 1630 },
    ],
  },
];
