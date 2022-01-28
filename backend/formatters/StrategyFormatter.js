const comparators = {
  "<": "$lt",
  ">": "$gt",
  "=": "$eq",
  "!=": "$ne",
  "<=": "$lte",
  ">=": "$gte",
};

isObject = function (a) {
  return !!a && a.constructor === Object;
};

function flatten(d, parent_key = "", sep = ".") {
  const items = [];

  for (var k in d) {
    const v = d[k];
    const new_key = parent_key ? parent_key + sep + k : k;

    if (isObject(v)) {
      items.push(...flatten(v, new_key, (sep = sep)));
    } else {
      items.push((new_key, v));
    }
  }

  return Object.fromEntries(items);
}

class StrategyFormatter {
  gen_condition(field, operator, value) {
    const sign = comparators[operator];
    return { [field]: { [sign]: Number(value) } };
  }

  gen_between_condition(field, values) {
    const x = values[0];
    const y = values[1];
    return { [field]: { $gte: x, $lte: y } };
  }

  condition_for_probability(rule) {
    const table_name = "probability";
    const column_name = rule["code"];
    const field = `${table_name}.${column_name}`;
    return [[this.gen_between_condition(field, rule["values"])], [field]];
  }

  condition_for_team(rule, team) {
    // console.log(rule);
    var table_name;
    var column_name;

    if (rule["category"] == "h2h") {
      table_name = "h2h_aggregate";
    } else {
      table_name = team;
    }

    if (rule["direct"]) {
      column_name = rule["code"];
    } else {
      column_name = rule[rule["location"]];
    }
    const field = `${table_name}.${column_name}`;

    return [this.gen_between_condition(field, rule["values"]), field];
  }

  condition_for_odds(rule) {
    const table_name = "pre_odds";
    const column_name = rule["code"];
    const operator = rule["comparator"];
    const value = rule["value"];
    const field = `${table_name}.${column_name}`;
    return [[this.gen_condition(field, operator, value)], [field]];
  }

  condition_for_aggregate_stats(rule) {
    // const teams = new Set(["home", "away"]);
    // console.log("team", rule["team"], teams.has(rule["team"]));
    const team = rule["team"];
    switch (team) {
      case "home":
      case "away":
        var [condition, field] = this.condition_for_team(rule, rule["team"]);
        var conditions = [condition];
        var fields = [field];
        break;
      default:
        var [condition_1, field_1] = this.condition_for_team(rule, "home");
        var [condition_2, field_2] = this.condition_for_team(rule, "away");
        var conditions = [condition_1, condition_2];
        var fields = [field_1, field_2];
        if (team == "either") {
          conditions = [{ $or: conditions }];
        }
    }

    return [conditions, fields];
  }

  query_for_pre_match_rules(strategy) {
    const pre_match_conditions = [];
    const pre_match_fields = [];
    for (var rule of strategy["strategy_prematch_rules"]) {
      if (rule["category"] == "probability") {
        var [conditions, fields] = this.condition_for_probability(rule);
      } else if (rule["category"] == "odds") {
        var [conditions, fields] = this.condition_for_odds(rule);
      } else {
        var [conditions, fields] = this.condition_for_aggregate_stats(rule);
      }

      pre_match_conditions.push(...conditions);

      pre_match_fields.push(...fields);
    }

    return [pre_match_conditions, pre_match_fields];
  }

  has_team(code, category) {
    const oddsWithTeam = new Set("dnb", "ht_result", "ft_result");
    if (category == "odds") {
      if (oddsWithTeam.has(code)) {
        return true;
      }
    } else {
      return true;
    }
  }

  parse_single_rule(code, category, table_name, team) {
    const name_map = {
      liveodds: "live_odds",
      preodds: "pre_odds",
      livestats: "stats",
    };
    table_name = name_map[table_name];
    if (category == "statistics" || this.has_team(code, category)) {
      return `${table_name}.${team}.${code}`;
    } else {
      return `${table_name}.${code}`;
    }
  }

  parse_rule(
    first_code,
    second_code,
    first_category,
    second_category,
    first_table_name,
    second_table_name,
    comparator,
    value,
    first_team,
    second_team
  ) {
    const name_map = {
      liveodds: "live_odds",
      preodds: "pre_odds",
      livestats: "stats",
    };

    const symbol = comparators[comparator];

    value = Number(value);
    if (
      first_category == "statistics" ||
      this.has_team(first_code, first_category)
    ) {
      const table_name = name_map[first_table_name];
      const field_1 = `${table_name}.home.${first_code}`;
      const field_2 = `${table_name}.away.${first_code}`;
      var fields = [field_1, field_2];
      if (first_team == "sum_of_teams") {
        const field_combined = { $add: [`$${field_1}`, `$${field_2}`] };
        var conditions = [{ $expr: { [symbol]: [field_combined, value] } }];
        return conditions, fields;
      } else if (first_team == "either_team") {
        var conditions = [
          {
            $or: [
              this.gen_condition(field_1, comparator, value),
              this.gen_condition(field_2, comparator, value),
            ],
          },
        ];
        return [conditions, fields];
      }
      const first_field = this.parse_single_rule(
        (code = first_code),
        (category = first_category),
        (table_name = first_table_name),
        (team = first_team)
      );
      var fields = [first_field];
      if (second_category == "numeric") {
        var second_field = value;
      } else {
        var second_field = this.parse_single_rule(
          (code = second_code),
          (category = second_category),
          (table_name = second_table_name),
          (team = second_team)
        );
        fields.append(second_field);
        second_field = "$" + second_field;
      }

      conditions = [{ $expr: { [symbol]: ["$" + first_field, second_field] } }];
      return [conditions, fields];
    }
  }

  query_for_in_play_rules(strategy) {
    in_play_conditions = [];
    in_play_fields = [];
    for (var rule of strategy["strategy_inplay_rules"]) {
      const {
        first_code,
        second_code,
        first_category,
        first_table_name,
        second_table_name,
        second_category,
        comparator,
        value,
        first_team,
        second_team,
      } = rule;

      const [conditions, fields] = this.parse_rule(
        first_code,
        second_code,
        first_category,
        second_category,
        first_table_name,
        second_table_name,
        comparator,
        value,
        first_team,
        second_team
      );
      in_play_conditions.push(...conditions);
      in_play_fields.push(...fields);
    }

    return [in_play_conditions, in_play_fields];
  }

  query_for_in_play_timer(strategy) {
    const timer = strategy["timer"];
    const from_minute = timer["from"];
    const to_minute = timer["to"];
    const time = timer["time"];
    const minute = timer["minute"];

    const time_map = {
      disabled: { minute: { $ne: -1 } },
      atMinuteX: { minute: { $eq: minute } },
      xMinutesAgo: { minute: { $eq: { $sub: ["$minute", minute] } } },
      betweenMinutesXandY: { minute: { $gte: from_minute, $lte: to_minute } },
      pastXminutes: { minute: { $gte: { $sub: ["$minute", minute] } } },
      sinceMinuteX: { minute: { $gte: minute } },
      untilMinuteX: { minute: { $lte: minute } },
      during1stHalf: { minute: { $lte: 45 } },
      during2ndHalf: { minute: { $gt: 45 } },
      atHalfTime: { status: { $eq: "HT" } },
      atFullTime: { minute: { $eq: 90 } },
    };
    return time_map[time];
  }

  query_for_leagues(strategy) {
    return { league_id: { $in: strategy["leagues"] } };
  }

  format(strategy) {
    // #picks = list(picks_table.find({"strategy_id": strategy["id"]}, {"fixture_id": 1}))
    // strategy[""]
    const [pre_match_conditions, pre_match_fields] =
      this.query_for_pre_match_rules(strategy);

    const fields = pre_match_fields;
    const league_conditions = [this.query_for_leagues(strategy)];
    const conditions = pre_match_conditions;
    if (strategy["type"] == "in-play") {
      const [in_play_conditions, in_play_fields] =
        this.query_for_in_play_rules(strategy);

      const timer_conditions = [this.query_for_in_play_timer(strategy)];
      const extra_conditions = [
        { status: { $in: ["LIVE", "HT", "PEN_LIVE", "BREAK", "ET"] } },
      ];
      conditions.push(...timer_conditions);
      conditions.push(...extra_conditions);
      conditions.push(...in_play_conditions);

      fields.push(...in_play_fields);
    }
    // console.log(strategy);
    conditions.push(...league_conditions);
    const WHERE = conditions;

    const query = { $and: WHERE };

    return query;
  }
}

// const strategy = {
//   id: 37,
//   title: "Test Series D",
//   is_public: 1,
//   timer: {
//     minute: 15,
//   },
//   note: "",
//   type: "pre-match",
//   hit_rate: "0.00",
//   leagues: [
//     1117, 1515, 1103, 1107, 1591, 1118, 1108, 711, 1999, 1570, 1756, 2004, 1359,
//     2027, 1360, 1361, 1358, 1675, 1676, 172, 1373, 1567, 812, 1597, 809, 893,
//     1902, 896, 815, 1649, 2029, 1669, 1093, 1502, 1094, 1330, 1333, 1642, 1658,
//     1334, 1457, 636, 639, 642, 645, 178, 175, 1095, 1335, 1088, 1395, 1788,
//     1734, 1085, 1729, 1762, 1751, 1543, 1614, 1514, 1409, 1670, 1490, 1447,
//     1485, 1796, 1696, 1892, 1408, 1697, 1407, 1399, 1736, 1383, 1382, 1381,
//     1883, 1889, 1890, 1891, 1356, 1953, 1954, 1955, 1981, 1583, 2025, 1657,
//     1656, 1655, 1654, 1924, 1816, 1925, 1820, 1923, 1817, 1818, 1899, 1819,
//     1512, 1822, 1821, 1823, 1939, 1511, 1510, 187, 184, 1695, 181, 193, 190,
//     196, 1603, 1785, 971, 1765, 1991, 974, 1772, 1336, 1871, 1870, 1535, 199,
//     202, 205, 1869, 1809, 1133, 1135, 1134, 214, 1136, 1137, 1138, 1139, 1140,
//     1141, 1142, 1143, 1757, 1144, 1145, 1418, 1131, 217, 211, 208, 1908, 1907,
//     1906, 1626, 1625, 1624, 1608, 1572, 1571, 1371, 1128, 1129, 1130, 1132,
//     1337, 977, 980, 1988, 1338, 1987, 1098, 232, 226, 223, 220, 1517, 1303,
//     1302, 1301, 1304, 660, 1305, 1299, 1300, 1309, 1298, 1297, 657, 1296, 1295,
//     654, 1294, 1293, 1292, 1291, 1290, 1289, 651, 1316, 1385, 1288, 1456, 1324,
//     1323, 1322, 1321, 1320, 1319, 1318, 1317, 1306, 1315, 1314, 1313, 1513,
//     1312, 1311, 1100, 1310, 1386, 1308, 1307, 1630, 1686, 1685, 1684, 1653,
//     1746, 1798, 1631, 1687, 1688, 1698, 648, 2005, 2006, 2014, 2010, 2012, 1808,
//     241, 1149, 1148, 1147, 1682, 1706, 1146, 229, 235, 238, 821, 1811, 1339,
//     1801, 1802, 818, 1689, 1901, 1380, 1900, 983, 986, 1699, 669, 666, 663, 989,
//     992, 995, 1414, 1340, 1860, 1848, 681, 678, 675, 672, 824, 1544, 687, 690,
//     827, 1154, 1153, 1152, 1151, 1150, 1927, 1926, 1976, 250, 247, 244, 1616,
//     1896, 259, 256, 253, 1155, 1464, 1468, 1467, 1466, 1460, 1465, 1459, 1469,
//     1156, 1471, 1445, 1444, 1443, 1470, 1461, 1159, 268, 1463, 1982, 265, 262,
//     1427, 1157, 1158, 1162, 1161, 1160, 1462, 274, 271, 277, 1573, 1748, 1169,
//     1168, 1170, 1167, 1171, 1621, 1909, 1163, 1164, 1165, 1660, 1911, 1646,
//     1166, 1659, 1916, 1341, 699, 696, 1797, 1966, 1965, 1964, 1412, 830, 702,
//     53, 1506, 1593, 8, 69, 68, 66, 9, 12, 63, 14, 60, 57, 54, 35, 51, 17, 20,
//     23, 48, 45, 24, 44, 42, 39, 27, 38, 1972, 30, 32, 1791, 1623, 1351, 1929,
//     1560, 1806, 1805, 1783, 1778, 1092, 1949, 1967, 1968, 1969, 1970, 1950,
//     1971, 1973, 2019, 2003, 2002, 289, 286, 1930, 1931, 1880, 1877, 1876, 1374,
//     1375, 2001, 2013, 998, 1419, 5, 1563, 1538, 1634, 1533, 1532, 1717, 1434,
//     1433, 1432, 1424, 1325, 1415, 1411, 1389, 1387, 1355, 1354, 1329, 1328,
//     1327, 1326, 720, 2, 280, 283, 1540, 1342, 2020, 292, 295, 1172, 298, 1886,
//     1728, 1173, 2030, 1750, 1554, 1174, 1175, 1639, 310, 1188, 2015, 313, 1182,
//     1638, 1181, 1637, 1180, 1673, 1179, 1674, 1178, 1177, 1176, 2008, 1187,
//     1186, 1575, 1185, 1184, 301, 304, 1183, 1641, 1640, 307, 833, 1644, 2018,
//     319, 1585, 316, 1586, 1587, 133, 100, 103, 1422, 1740, 106, 109, 112, 1879,
//     115, 118, 121, 124, 127, 130, 1595, 136, 139, 142, 145, 148, 151, 1576, 154,
//     157, 160, 163, 166, 169, 94, 97, 91, 88, 85, 2007, 1683, 1794, 82, 836,
//     1709, 1526, 1194, 1961, 328, 1962, 1193, 1932, 1627, 1628, 1192, 1629, 1191,
//     1190, 1189, 1933, 325, 1759, 1770, 331, 839, 842, 705, 708, 845, 1343, 734,
//     1004, 1528, 1001, 1775, 343, 340, 337, 334, 1577, 1947, 1948, 1201, 1195,
//     1196, 1200, 1197, 1198, 1199, 2032, 1602, 2033, 1710, 1711, 2035, 1888,
//     2036, 354, 351, 348, 345, 1694, 1693, 2031, 357, 2024, 2023, 2022, 1882,
//     1881, 1590, 2009, 1472, 1473, 1505, 1416, 1007, 1980, 2016, 1013, 1010,
//     1718, 1019, 1016, 1474, 1974, 905, 2028, 2017, 1428, 908, 899, 902, 914,
//     911, 917, 1730, 1766, 1598, 372, 375, 378, 381, 1776, 1744, 1437, 1450,
//     1426, 390, 1210, 1622, 1217, 1216, 1215, 1214, 1213, 1212, 1211, 384, 1209,
//     1208, 1207, 1206, 1205, 1204, 1203, 1202, 1594, 1588, 387, 1578, 1530, 1664,
//     737, 1768, 1790, 1721, 968, 1719, 1022, 1025, 1028, 1031, 1671, 1769, 920,
//     1417, 1648, 1508, 396, 393, 1645, 848, 1043, 1661, 1662, 1046, 1040, 1037,
//     1034, 1362, 1489, 1488, 1992, 926, 923, 1777, 1518, 1893, 399, 1388, 1956,
//     402, 1993, 1994, 1995, 932, 1519, 851, 1520, 1952, 1541, 405, 408, 1504,
//     1677, 1704, 417, 414, 1500, 854, 1393, 1049, 1052, 1521, 1522, 857, 1402,
//     1592, 1436, 420, 423, 1524, 1523, 1780, 1579, 749, 1935, 746, 743, 1779,
//     1723, 1722, 429, 426, 1716, 1747, 435, 432, 1429, 860, 863, 1553, 1825,
//     1737, 1546, 1741, 1478, 1479, 1742, 1480, 1481, 1792, 1482, 869, 1344, 1739,
//     1353, 1894, 2037, 72, 1781, 1448, 1097, 1096, 81, 74, 80, 78, 77, 1055,
//     1580, 1963, 752, 1829, 866, 1475, 1609, 438, 1701, 1700, 1442, 441, 447,
//     1977, 1978, 450, 1761, 1760, 1758, 1561, 1745, 444, 1221, 1220, 1219, 1218,
//     1527, 1996, 1487, 935, 1058, 1449, 2034, 1477, 1345, 1725, 755, 758, 761,
//     1767, 1707, 764, 1787, 1786, 767, 1061, 1986, 1446, 459, 456, 453, 1222,
//     1223, 1384, 1936, 1435, 462, 471, 468, 465, 1599, 1224, 1225, 1226, 1227,
//     1228, 1229, 1230, 1231, 1232, 1233, 1234, 1235, 1934, 1601, 941, 938, 1989,
//     1983, 2021, 360, 363, 1945, 1946, 1647, 366, 369, 480, 1749, 474, 1957,
//     1958, 1959, 1960, 1581, 477, 1236, 1636, 483, 1237, 1241, 1238, 1239, 1242,
//     1240, 1672, 492, 1793, 498, 1712, 1713, 489, 1484, 486, 1525, 1984, 495,
//     872, 1975, 1346, 1678, 953, 950, 1557, 947, 944, 1782, 501, 504, 507, 1643,
//     510, 513, 516, 519, 522, 525, 528, 1547, 875, 1244, 1243, 531, 1245, 1246,
//     1501, 534, 1922, 1679, 1357, 1372, 540, 543, 1247, 1667, 1250, 1665, 1249,
//     1248, 552, 549, 546, 1534, 1944, 561, 558, 555, 1943, 1942, 1941, 1940,
//     1928, 1392, 1438, 1413, 1455, 806, 1378, 1666, 1122, 2039, 1116, 1486, 1483,
//     1784, 1114, 1807, 1606, 1613, 1831, 1846, 1845, 1844, 1843, 1842, 1841,
//     1840, 1838, 1837, 1836, 1833, 1832, 1257, 1830, 1824, 1256, 1255, 1254,
//     1253, 1252, 1251, 1604, 1799, 1795, 1268, 570, 1951, 567, 564, 1568, 1275,
//     1274, 1273, 1272, 1271, 1270, 1269, 1847, 1267, 1266, 1589, 1265, 1264,
//     1263, 1262, 1261, 1260, 1258, 1839, 1503, 1620, 1771, 1810, 878, 1347, 576,
//     1635, 1552, 1755, 1754, 1753, 588, 1276, 1277, 1278, 1279, 1280, 1281, 573,
//     582, 579, 585, 1548, 1498, 1681, 1912, 1913, 1914, 1915, 1497, 1569, 591,
//     594, 597, 1492, 881, 1857, 1852, 884, 1064, 1067, 1070, 1727, 1663, 1539,
//     1348, 2026, 956, 1430, 1680, 1283, 606, 1937, 1282, 1898, 1287, 1286, 1285,
//     1284, 1735, 1938, 1763, 600, 1403, 1619, 1764, 1618, 603, 1864, 1596, 1423,
//     1691, 615, 609, 612, 1545, 621, 618, 1406, 1789, 1990, 1458, 1774, 965, 962,
//     959, 1773, 1615, 770, 776, 773, 794, 1897, 1803, 1885, 2038, 1607, 797,
//     1804, 791, 1617, 788, 779, 782, 1349, 1917, 1910, 1918, 1921, 1887, 1920,
//     1919, 1551, 803, 800, 1668, 1073, 1702, 1076, 1079, 1800, 1884, 1705, 1752,
//     630, 633, 624, 1738, 627, 1605, 1612, 1127, 1582, 1611, 1600, 1394, 1440,
//     1715, 1714, 1708, 1404, 1400, 1398, 1396, 1812, 723, 1549, 1390, 1379, 1376,
//     1550, 1703, 1370, 1126, 1494, 1529, 1733, 1507, 1731, 1499, 732, 1726, 1496,
//     1495, 1369, 1491, 729, 1536, 1537, 1476, 726, 1542, 1452, 1115, 1105, 1565,
//     1106, 1109, 1110, 1111, 1112, 1566, 1113, 1104, 1652, 1651, 1119, 1120,
//     1121, 1650, 1123, 1124, 1125, 1102, 1368, 1555, 1692, 1367, 1690, 1366,
//     1365, 1364, 1363, 717, 1562, 714, 1082, 1101, 1350, 1998, 1997, 890, 887,
//   ],
//   trusted: 1,
//   active: 1,
//   picks_sent: 0,
//   strategy_inplay_rules: [],
//   strategy_prematch_rules: [
//     {
//       code: "played",
//       category: "general",
//       overall: "played_overall",
//       home: "played_home",
//       label: "Matches Played",
//       away: "played_away",
//       id: 102,
//       strategy_id: 37,
//       id: "played_general",
//       location: "overall",
//       team: "both",
//       comparator: "=",
//       value: "1.00",
//       values: [10, 60],
//     },
//     {
//       code: "home_win_probability",
//       category: "probability",
//       overall: null,
//       home: null,
//       label: "Home Win",
//       away: null,
//       id: 103,
//       strategy_id: 37,
//       id: "home_win_probability",
//       location: "overall",
//       team: "both",
//       comparator: "=",
//       value: "1.00",
//       values: [52, 100],
//     },
//     {
//       code: "home_win",
//       category: "odds",
//       overall: null,
//       home: null,
//       label: "Home Win",
//       away: null,
//       id: 104,
//       strategy_id: 37,
//       id: "home_win_odds",
//       location: "overall",
//       team: "both",
//       comparator: ">=",
//       value: "1.40",
//       values: [0, 100],
//     },
//   ],
//   outcomes: [
//     {
//       code: "home_win",
//       label: "Home Win",
//       outcome_id: 80521,
//       strategy_id: 37,
//     },
//   ],
// };

// const formatter = new StrategyFormatter();
// console.log(JSON.stringify(formatter.format(strategy), null, 2));

module.exports = StrategyFormatter;
