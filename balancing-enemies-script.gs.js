/**
 * =============================================================================
 * SISTEMA DE CÁLCULO DE DANO ESPERADO POR TURNO (DEPT)
 * Para TTRPG High-Fantasy Dungeonpunk com Dice Pool e Step Dice
 * =============================================================================
 *
 * REGRAS DO SISTEMA:
 * - Sucessos: resultados >= 6 no dado
 * - Falhas Críticas: resultados == 1 cancelam um sucesso
 * - Sucessos Líquidos (net) = sucessos - falhas_críticas (mínimo 0)
 *
 * PATAMARES DE DANO (baseados em net vs defesa):
 * - Raspão (net <= defesa): metade da média da arma, SEM modificador
 * - Normal (net = defesa + 1): média da arma + modificador
 * - Em Cheio (net = defesa + 2): máximo da arma + modificador
 * - Crítico (net >= defesa + 3): máximo da arma + modificador + média do crítico
 *
 * FUNÇÕES PRINCIPAIS:
 * =CALC_DEPT("3d8", "1d10+3", 0, "3d10")          → Retorna dano esperado
 * =DEPT_BREAKDOWN("3d8", "1d10+3", 0, "3d10")     → Tabela detalhada por patamar
 * =POOL_STATS("3d8")                              → Estatísticas da pool
 * =EXPECTED_DAMAGE("3d8", "1d10", 3, "3d10", 0, 1, 4) → Array 2D completo
 *
 * @author Sistema de Balanceamento TTRPG
 * @version 2.1 (Otimizado)
 * =============================================================================
 */

// =============================================================================
// SEÇÃO 1: FUNÇÕES UTILITÁRIAS DE PARSING
// =============================================================================

/**
 * Analisa uma string de dados no formato "NdX" e retorna os componentes.
 * @param {string} diceString - String no formato "NdX" (ex: "3d8", "2d10")
 * @returns {Object} Objeto com {count, sides} ou null se inválido
 * @customfunction
 */
function PARSEDICE(diceString) {
  if (!diceString || typeof diceString !== "string") {
    return null;
  }

  const cleaned = diceString.toLowerCase().trim();
  const match = cleaned.match(/^(\d+)d(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    count: parseInt(match[1], 10),
    sides: parseInt(match[2], 10),
  };
}

/**
 * Analisa uma expressão de dano no formato "NdX+Y" ou "NdX".
 * @param {string} damageString - String de dano (ex: "1d10+3", "2d6")
 * @returns {Object} Objeto com {diceCount, diceSides, modifier}
 */
function parseDamageExpression(damageString) {
  if (!damageString || typeof damageString !== "string") {
    return { diceCount: 0, diceSides: 0, modifier: 0 };
  }

  const cleaned = damageString.toLowerCase().trim();

  // Padrão: NdX+Y ou NdX-Y ou NdX
  const match = cleaned.match(/^(\d+)d(\d+)([+-]\d+)?$/);

  if (!match) {
    // Tenta apenas número (modificador puro)
    const modOnly = parseInt(cleaned, 10);
    if (!isNaN(modOnly)) {
      return { diceCount: 0, diceSides: 0, modifier: modOnly };
    }
    return { diceCount: 0, diceSides: 0, modifier: 0 };
  }

  return {
    diceCount: parseInt(match[1], 10),
    diceSides: parseInt(match[2], 10),
    modifier: match[3] ? parseInt(match[3], 10) : 0,
  };
}

// =============================================================================
// SEÇÃO 2: FUNÇÕES MATEMÁTICAS PARA PROBABILIDADES
// =============================================================================

/**
 * Calcula coeficiente binomial C(n, k) usando multiplicação iterativa.
 * Evita overflow para valores moderados de n.
 * @param {number} n - Total
 * @param {number} k - Escolhas
 * @returns {number} Coeficiente binomial
 */
function comb(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k; // Otimização: C(n,k) = C(n, n-k)

  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return Math.round(result); // Arredonda para evitar erros de ponto flutuante
}

/**
 * Calcula coeficiente multinomial: n! / (k1! * k2! * ... * km!)
 * @param {number} n - Total
 * @param {number[]} ks - Array de contagens [k1, k2, ...]
 * @returns {number} Coeficiente multinomial
 */
function multinomial(n, ks) {
  let result = 1;
  let remaining = n;

  for (const k of ks) {
    result *= comb(remaining, k);
    remaining -= k;
  }

  return result;
}

/**
 * Calcula as probabilidades por face para um dado de tamanho S.
 * @param {number} sides - Número de faces do dado
 * @returns {Object} {pSuccess, pOne, pNeither}
 */
function getFaceProbabilities(sides) {
  // Sucesso: face >= 6
  const pSuccess = Math.max(0, (sides - 5) / sides);
  // Face 1: sempre 1/sides
  const pOne = 1 / sides;
  // Nem sucesso nem 1
  const pNeither = 1 - pSuccess - pOne;

  return { pSuccess, pOne, pNeither };
}

/**
 * Calcula a distribuição completa de (sucessos, uns) para uma pool de dados.
 * Usa distribuição multinomial exata.
 * @param {number} numDice - Número de dados na pool
 * @param {number} diceSides - Número de faces do dado
 * @returns {Map} Map de "s,o" -> probabilidade
 */
function calculateSuccessDistribution(numDice, diceSides) {
  const { pSuccess, pOne, pNeither } = getFaceProbabilities(diceSides);
  const distribution = new Map();

  // Itera sobre todas as combinações possíveis de (sucessos, uns)
  for (let s = 0; s <= numDice; s++) {
    for (let o = 0; o <= numDice - s; o++) {
      const r = numDice - s - o; // Resultados "neither"

      // Probabilidade multinomial
      const coef = multinomial(numDice, [s, o, r]);
      const prob =
        coef *
        Math.pow(pSuccess, s) *
        Math.pow(pOne, o) *
        Math.pow(pNeither, r);

      if (prob > 0) {
        distribution.set(`${s},${o}`, prob);
      }
    }
  }

  return distribution;
}

/**
 * Converte distribuição de (sucessos, uns) para distribuição de sucessos líquidos.
 * @param {Map} distribution - Distribuição de (s, o)
 * @returns {Object} Objeto com netSuccesses como chaves e probabilidades como valores
 */
function getNetSuccessDistribution(distribution) {
  const netDist = {};

  for (const [key, prob] of distribution) {
    const [s, o] = key.split(",").map(Number);
    const net = Math.max(0, s - o); // Sucessos líquidos (mínimo 0)

    if (!netDist[net]) {
      netDist[net] = 0;
    }
    netDist[net] += prob;
  }

  return netDist;
}

/**
 * Calcula distribuição de sucessos líquidos para uma pool de dados.
 * Função de conveniência que combina as duas anteriores.
 * @param {number} numDice - Número de dados
 * @param {number} diceSides - Lados do dado
 * @returns {Object} Distribuição de sucessos líquidos
 */
function calculateNetSuccessDistribution(numDice, diceSides) {
  const rawDist = calculateSuccessDistribution(numDice, diceSides);
  return getNetSuccessDistribution(rawDist);
}

// =============================================================================
// SEÇÃO 3: FUNÇÕES DE CÁLCULO DE DANO
// =============================================================================

/**
 * Calcula os valores de dano para cada patamar.
 * @param {number} weaponDiceCount - Quantidade de dados da arma
 * @param {number} weaponDiceSides - Lados dos dados da arma
 * @param {number} damageModifier - Modificador de atributo
 * @param {number} critDiceCount - Quantidade de dados de crítico
 * @param {number} critDiceSides - Lados dos dados de crítico
 * @returns {Object} Valores de dano para cada patamar
 */
function calculateDamageValues(
  weaponDiceCount,
  weaponDiceSides,
  damageModifier,
  critDiceCount,
  critDiceSides,
) {
  // Média do dado da arma: (1 + sides) / 2
  const avgWeaponDie = (1 + weaponDiceSides) / 2;
  const avgWeaponTotal = weaponDiceCount * avgWeaponDie;

  // Máximo do dado da arma
  const maxWeaponTotal = weaponDiceCount * weaponDiceSides;

  // Média do crítico
  const avgCritDie = critDiceSides > 0 ? (1 + critDiceSides) / 2 : 0;
  const avgCritTotal = critDiceCount * avgCritDie;

  return {
    // Raspão: metade da média da arma, SEM modificador (arredonda para baixo)
    raspao: Math.floor(avgWeaponTotal / 2),

    // Normal: média da arma + modificador
    normal: avgWeaponTotal + damageModifier,

    // Em Cheio: máximo da arma + modificador
    emCheio: maxWeaponTotal + damageModifier,

    // Crítico: máximo da arma + modificador + média do crítico
    critico: maxWeaponTotal + damageModifier + avgCritTotal,

    // Metadados para explicação
    _avgWeapon: avgWeaponTotal,
    _maxWeapon: maxWeaponTotal,
    _avgCrit: avgCritTotal,
  };
}

/**
 * Determina qual patamar de dano aplicar baseado nos sucessos líquidos e defesa.
 * @param {number} netSuccesses - Sucessos líquidos do atacante
 * @param {number} enemyDefense - Defesa do inimigo
 * @returns {string} Patamar: 'raspao', 'normal', 'emCheio', ou 'critico'
 */
function getDamageTier(netSuccesses, enemyDefense) {
  const margin = netSuccesses - enemyDefense;

  if (margin <= 0) return "raspao";
  if (margin === 1) return "normal";
  if (margin === 2) return "emCheio";
  return "critico"; // margin >= 3
}

/**
 * Calcula o dano esperado por ataque usando distribuição exata.
 * @param {Object} netSuccessDist - Distribuição de sucessos líquidos
 * @param {Object} damageValues - Valores de dano por patamar
 * @param {number} enemyDefense - Defesa do inimigo
 * @returns {Object} Dano esperado e breakdown por patamar
 */
function calculateExpectedDamage(netSuccessDist, damageValues, enemyDefense) {
  let expectedDamage = 0;
  const breakdown = {
    raspao: { prob: 0, contribution: 0 },
    normal: { prob: 0, contribution: 0 },
    emCheio: { prob: 0, contribution: 0 },
    critico: { prob: 0, contribution: 0 },
  };

  for (const [netStr, prob] of Object.entries(netSuccessDist)) {
    const net = parseInt(netStr, 10);
    const tier = getDamageTier(net, enemyDefense);
    const damage = damageValues[tier];

    const contribution = prob * damage;
    expectedDamage += contribution;

    breakdown[tier].prob += prob;
    breakdown[tier].contribution += contribution;
  }

  return { expectedDamage, breakdown };
}

// =============================================================================
// SEÇÃO 4: FUNÇÕES PRINCIPAIS (CUSTOM FUNCTIONS)
// =============================================================================

/**
 * Calcula o Dano Esperado por Turno (DEPT) para um ataque.
 * Função principal simplificada para uso direto no Google Sheets.
 *
 * @param {string} dicePool - A pool de dados de ataque (ex: "3d8")
 * @param {string} weaponDamage - A expressão de dano da arma (ex: "1d10+3")
 * @param {number} enemyDefense - A defesa em sucessos do inimigo
 * @param {string} critDamage - Os dados de dano crítico (ex: "3d10")
 * @return {number} O valor decimal do dano esperado por ataque
 * @customfunction
 */
function CALC_DEPT(dicePool, weaponDamage, enemyDefense, critDamage) {
  try {
    // Validação e parsing da pool de ataque
    const pool = PARSEDICE(dicePool);
    if (!pool) {
      return "Erro: Formato inválido em dicePool. Use 'NdX' (ex: '3d8')";
    }

    // Parsing do dano da arma
    const weapon = parseDamageExpression(weaponDamage);
    if (
      weapon.diceCount === 0 &&
      weapon.diceSides === 0 &&
      weapon.modifier === 0
    ) {
      return "Erro: Formato inválido em weaponDamage. Use 'NdX+Y' (ex: '1d10+3')";
    }

    // Parsing do dano crítico (opcional)
    let crit = { count: 0, sides: 0 };
    if (critDamage && critDamage !== "" && critDamage !== 0) {
      const parsedCrit = PARSEDICE(String(critDamage));
      if (parsedCrit) {
        crit = parsedCrit;
      }
    }

    // Validação da defesa
    const defense = parseInt(enemyDefense, 10) || 0;

    // Cálculo da distribuição de sucessos líquidos
    const netDist = calculateNetSuccessDistribution(pool.count, pool.sides);

    // Cálculo dos valores de dano
    const damageValues = calculateDamageValues(
      weapon.diceCount,
      weapon.diceSides,
      weapon.modifier,
      crit.count,
      crit.sides,
    );

    // Cálculo do dano esperado
    const result = calculateExpectedDamage(netDist, damageValues, defense);

    return Math.round(result.expectedDamage * 100) / 100; // 2 casas decimais
  } catch (error) {
    return "Erro: " + error.message;
  }
}

/**
 * Calcula Dano Esperado completo com múltiplas saídas.
 * Retorna array 2D com dano por ataque, por turno, por grupo e explicação.
 *
 * @param {string} pool - Pool de dados de ataque (ex: "3d8")
 * @param {string} weaponDice - Dados da arma (ex: "1d10")
 * @param {number} attrMod - Modificador de atributo (ex: 3)
 * @param {string} critDice - Dados de crítico (ex: "3d10") ou "" se não houver
 * @param {number} defense - Defesa do inimigo em sucessos
 * @param {number} attacksPerTurn - Ataques por turno (default: 1)
 * @param {number} groupSize - Tamanho do grupo (default: 4)
 * @return {Array} Array 2D com resultados detalhados
 * @customfunction
 */
function EXPECTED_DAMAGE(
  pool,
  weaponDice,
  attrMod,
  critDice,
  defense,
  attacksPerTurn,
  groupSize,
) {
  try {
    // Defaults
    attacksPerTurn = attacksPerTurn || 1;
    groupSize = groupSize || 4;

    // Parsing da pool
    const poolParsed = PARSEDICE(pool);
    if (!poolParsed) {
      return [["Erro", "Formato inválido em pool. Use 'NdX'"]];
    }

    // Parsing da arma
    const weaponParsed = PARSEDICE(weaponDice);
    if (!weaponParsed) {
      return [["Erro", "Formato inválido em weaponDice. Use 'NdX'"]];
    }

    // Parsing do crítico
    let critParsed = { count: 0, sides: 0 };
    if (critDice && critDice !== "" && critDice !== 0) {
      const parsed = PARSEDICE(String(critDice));
      if (parsed) {
        critParsed = parsed;
      }
    }

    // Modificador
    const modifier = parseInt(attrMod, 10) || 0;
    const defenseVal = parseInt(defense, 10) || 0;

    // Cálculos
    const netDist = calculateNetSuccessDistribution(
      poolParsed.count,
      poolParsed.sides,
    );
    const damageValues = calculateDamageValues(
      weaponParsed.count,
      weaponParsed.sides,
      modifier,
      critParsed.count,
      critParsed.sides,
    );

    const result = calculateExpectedDamage(netDist, damageValues, defenseVal);

    // Resultados
    const perAttack = Math.round(result.expectedDamage * 100) / 100;
    const perTurn = Math.round(perAttack * attacksPerTurn * 100) / 100;
    const perGroup = Math.round(perTurn * groupSize * 100) / 100;

    // Probabilidades de sucesso
    const { pSuccess } = getFaceProbabilities(poolParsed.sides);

    // Breakdown formatado
    const breakdownStr =
      `Raspão: ${(result.breakdown.raspao.prob * 100).toFixed(1)}% (${damageValues.raspao} dano), ` +
      `Normal: ${(result.breakdown.normal.prob * 100).toFixed(1)}% (${damageValues.normal.toFixed(1)} dano), ` +
      `Cheio: ${(result.breakdown.emCheio.prob * 100).toFixed(1)}% (${damageValues.emCheio} dano), ` +
      `Crítico: ${(result.breakdown.critico.prob * 100).toFixed(1)}% (${damageValues.critico.toFixed(1)} dano)`;

    // Explicação
    const explanation =
      `Pool: ${pool} (p_suc=${(pSuccess * 100).toFixed(1)}%), ` +
      `Arma: ${weaponDice}+${modifier}, Crit: ${critDice || "nenhum"}, ` +
      `Def: ${defenseVal}. ${breakdownStr}`;

    return [
      ["Métrica", "Valor"],
      ["Dano por Ataque", perAttack],
      ["Dano por Turno", perTurn],
      ["Dano do Grupo", perGroup],
      ["Explicação", explanation],
    ];
  } catch (error) {
    return [["Erro", error.message]];
  }
}

/**
 * Retorna estatísticas detalhadas de uma pool de dados.
 * Útil para análise e debugging.
 *
 * @param {string} dicePool - Pool de dados (ex: "3d8")
 * @return {Array} Array 2D com estatísticas
 * @customfunction
 */
function POOL_STATS(dicePool) {
  try {
    const pool = PARSEDICE(dicePool);
    if (!pool) {
      return [["Erro", "Formato inválido"]];
    }

    const { pSuccess, pOne, pNeither } = getFaceProbabilities(pool.sides);
    const netDist = calculateNetSuccessDistribution(pool.count, pool.sides);

    // Média de sucessos líquidos
    let avgNet = 0;
    for (const [netStr, prob] of Object.entries(netDist)) {
      avgNet += parseInt(netStr, 10) * prob;
    }

    // Formata distribuição
    const distArray = Object.entries(netDist)
      .sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10))
      .map(([net, prob]) => `${net}: ${(prob * 100).toFixed(2)}%`);

    return [
      ["Estatística", "Valor"],
      ["Pool", dicePool],
      ["P(Sucesso por dado)", (pSuccess * 100).toFixed(2) + "%"],
      ["P(Face 1 por dado)", (pOne * 100).toFixed(2) + "%"],
      ["Média Sucessos Líquidos", avgNet.toFixed(2)],
      ["Distribuição", distArray.join(", ")],
    ];
  } catch (error) {
    return [["Erro", error.message]];
  }
}

/**
 * Gera tabela de probabilidades para uma pool de dados.
 * Retorna array horizontal com P(0), P(1), ..., P(max) sucessos líquidos.
 *
 * @param {string} dicePool - Pool de dados (ex: "3d8")
 * @param {number} [maxSuccesses=8] - Máximo de sucessos a retornar
 * @return {Array} Array horizontal de probabilidades
 * @customfunction
 */
function PROB_TABLE(dicePool, maxSuccesses) {
  try {
    maxSuccesses = maxSuccesses || 8;

    const pool = PARSEDICE(dicePool);
    if (!pool) {
      return ["Erro: Formato inválido"];
    }

    const netDist = calculateNetSuccessDistribution(pool.count, pool.sides);

    const result = [];
    for (let i = 0; i <= maxSuccesses; i++) {
      result.push(netDist[i] || 0);
    }

    return [result];
  } catch (error) {
    return ["Erro: " + error.message];
  }
}

/**
 * Calcula breakdown detalhado do dano esperado por patamar.
 *
 * @param {string} dicePool - Pool de ataque
 * @param {string} weaponDamage - Dano da arma
 * @param {number} enemyDefense - Defesa do inimigo
 * @param {string} critDamage - Dados de crítico
 * @return {Array} Array 2D com breakdown detalhado
 * @customfunction
 */
function DEPT_BREAKDOWN(dicePool, weaponDamage, enemyDefense, critDamage) {
  try {
    const pool = PARSEDICE(dicePool);
    if (!pool) return [["Erro", "Pool inválida"]];

    const weapon = parseDamageExpression(weaponDamage);

    let crit = { count: 0, sides: 0 };
    if (critDamage && critDamage !== "") {
      const parsed = PARSEDICE(String(critDamage));
      if (parsed) crit = parsed;
    }

    const defense = parseInt(enemyDefense, 10) || 0;
    const netDist = calculateNetSuccessDistribution(pool.count, pool.sides);
    const damageValues = calculateDamageValues(
      weapon.diceCount,
      weapon.diceSides,
      weapon.modifier,
      crit.count,
      crit.sides,
    );

    const result = calculateExpectedDamage(netDist, damageValues, defense);

    return [
      ["Patamar", "Probabilidade", "Dano", "Contribuição"],
      [
        "Raspão",
        (result.breakdown.raspao.prob * 100).toFixed(2) + "%",
        damageValues.raspao,
        result.breakdown.raspao.contribution.toFixed(2),
      ],
      [
        "Normal",
        (result.breakdown.normal.prob * 100).toFixed(2) + "%",
        damageValues.normal.toFixed(1),
        result.breakdown.normal.contribution.toFixed(2),
      ],
      [
        "Em Cheio",
        (result.breakdown.emCheio.prob * 100).toFixed(2) + "%",
        damageValues.emCheio,
        result.breakdown.emCheio.contribution.toFixed(2),
      ],
      [
        "Crítico",
        (result.breakdown.critico.prob * 100).toFixed(2) + "%",
        damageValues.critico.toFixed(1),
        result.breakdown.critico.contribution.toFixed(2),
      ],
      ["TOTAL", "100%", "-", result.expectedDamage.toFixed(2)],
    ];
  } catch (error) {
    return [["Erro", error.message]];
  }
}

/**
 * Gera tabela de probabilidades para uma pool de dados.
 * Retorna array horizontal com P(0), P(1), ..., P(max) sucessos líquidos.
 *
 * @param {string} dicePool - Pool de dados (ex: "3d8")
 * @param {number} [maxSuccesses=8] - Máximo de sucessos a retornar
 * @return {Array} Array horizontal de probabilidades
 * @customfunction
 */
function PROB_TABLE(dicePool, maxSuccesses) {
  try {
    maxSuccesses = maxSuccesses || 8;

    const pool = PARSEDICE(dicePool);
    if (!pool) {
      return ["Erro: Formato inválido"];
    }

    const netDist = calculateNetSuccessDistribution(pool.count, pool.sides);

    const result = [];
    for (let i = 0; i <= maxSuccesses; i++) {
      result.push(netDist[i] || 0);
    }

    return [result];
  } catch (error) {
    return ["Erro: " + error.message];
  }
}
