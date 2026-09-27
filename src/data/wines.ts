export interface Wine {
  id: string;
  name: string; // 酒款
  region: string; // 产区
  grape: string; // 葡萄品种
  vintage: string; // 年份
  acidity: string; // 酸度
  aromas: string; // 香气关键词
}

export const WINE_BANK: Wine[] = [
  {
    id: "chablis-premier-cru",
    name: "夏布利一级园",
    region: "法国 · 勃艮第夏布利",
    grape: "霞多丽",
    vintage: "2021",
    acidity: "高酸",
    aromas: "青苹果、柠檬皮、湿石头",
  },
  {
    id: "medoc-cru-classe",
    name: "上梅多克列级庄",
    region: "法国 · 波尔多上梅多克",
    grape: "赤霞珠为主的混酿",
    vintage: "2018",
    acidity: "中高酸",
    aromas: "黑醋栗、雪松、铅笔芯",
  },
  {
    id: "cote-de-nuits-village",
    name: "夜丘村级黑皮诺",
    region: "法国 · 勃艮第夜丘",
    grape: "黑皮诺",
    vintage: "2020",
    acidity: "中高酸",
    aromas: "红樱桃、蘑菇、湿树叶",
  },
  {
    id: "napa-cabernet",
    name: "纳帕谷赤霞珠",
    region: "美国 · 加州纳帕谷",
    grape: "赤霞珠",
    vintage: "2019",
    acidity: "中等酸",
    aromas: "黑莓、香草、摩卡",
  },
  {
    id: "rioja-reserva",
    name: "里奥哈珍藏",
    region: "西班牙 · 里奥哈",
    grape: "丹魄",
    vintage: "2017",
    acidity: "中等酸",
    aromas: "香草、椰子、熟李子",
  },
  {
    id: "mosel-riesling",
    name: "摩泽尔雷司令",
    region: "德国 · 摩泽尔",
    grape: "雷司令",
    vintage: "2022",
    acidity: "高酸",
    aromas: "青柠、白桃、燧石",
  },
  {
    id: "marlborough-sauvignon",
    name: "马尔堡长相思",
    region: "新西兰 · 马尔堡",
    grape: "长相思",
    vintage: "2023",
    acidity: "高酸",
    aromas: "百香果、青草、西柚",
  },
  {
    id: "barolo",
    name: "巴罗洛",
    region: "意大利 · 皮埃蒙特",
    grape: "内比奥罗",
    vintage: "2018",
    acidity: "高酸",
    aromas: "干玫瑰、焦油、樱桃干",
  },
  {
    id: "mendoza-malbec",
    name: "门多萨马尔贝克",
    region: "阿根廷 · 门多萨",
    grape: "马尔贝克",
    vintage: "2021",
    acidity: "中等酸",
    aromas: "黑李子、紫罗兰、可可",
  },
  {
    id: "champagne-nv",
    name: "无年份香槟",
    region: "法国 · 香槟区",
    grape: "霞多丽、黑皮诺混酿",
    vintage: "NV 无年份",
    acidity: "高酸",
    aromas: "柑橘、烤面包、白花",
  },
];

export const WINE_BY_ID: Record<string, Wine> = Object.fromEntries(
  WINE_BANK.map((wine) => [wine.id, wine])
);
