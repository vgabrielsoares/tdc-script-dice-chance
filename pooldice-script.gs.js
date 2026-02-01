// ==================== SISTEMA 1: COM CANCELAMENTOS ====================

/**
 * Calcula a probabilidade de obter pelo menos X sucessos líquidos em uma rolagem de dados d6.
 * Sucesso: resultado >= threshold | Cancelamento: resultado = 1 | Neutro: resto
 * Sucessos líquidos = max(0, sucessos - cancelamentos)
 * @param {number} n - Número de dados a rolar
 * @param {number} threshold - Valor mínimo para sucesso (2 a 6)
 * @param {number} sucessosMinimos - Quantidade mínima de sucessos líquidos desejados
 * @returns {number} Probabilidade de sucesso (0 a 1)
 * @customfunction
 */
function probabilidadeSucessos(n, threshold, sucessosMinimos) {
  if (sucessosMinimos <= 0) return 1;
  if (sucessosMinimos > n) return 0;

  let probSucesso = (7 - threshold) / 6;
  let probCancela = 1 / 6;
  let probNeutro = (threshold - 2) / 6;

  let total = 0;

  for (let s = 0; s <= n; s++) {
    for (let c = 0; c <= n - s; c++) {
      let neutros = n - s - c;
      if (neutros < 0) continue;

      let sucessosLiquidos = Math.max(0, s - c);

      if (sucessosLiquidos >= sucessosMinimos) {
        let probComb =
          Math.pow(probSucesso, s) *
          Math.pow(probCancela, c) *
          Math.pow(probNeutro, neutros) *
          combinacaoMultinomial(n, s, c, neutros);
        total += probComb;
      }
    }
  }

  return total;
}

// ==================== SISTEMA 1.1: SUCESSOS EXATOS COM CANCELAMENTO ====================

/**
 * Calcula a probabilidade de obter exatamente X sucessos líquidos em uma rolagem de dados d6.
 * Sucesso: resultado >= threshold | Cancelamento: resultado = 1 | Neutro: resto
 * Sucessos líquidos = max(0, sucessos - cancelamentos)
 * @param {number} n - Número de dados a rolar
 * @param {number} threshold - Valor mínimo para sucesso (2 a 6)
 * @param {number} sucessosExatos - Quantidade exata de sucessos líquidos desejados
 * @returns {number} Probabilidade de obter exatamente esse número de sucessos (0 a 1)
 * @customfunction
 */
function probabilidadeExatosSucessosComCancelamento(
  n,
  threshold,
  sucessosExatos,
) {
  if (sucessosExatos < 0 || sucessosExatos > n) return 0;

  let probSucesso = (7 - threshold) / 6;
  let probCancela = 1 / 6;
  let probNeutro = (threshold - 2) / 6;

  let total = 0;

  for (let c = 0; c <= n; c++) {
    for (let s = 0; s <= n - c; s++) {
      let neutros = n - s - c;
      if (neutros < 0) continue;

      let sucessosLiquidos = Math.max(0, s - c);

      if (sucessosLiquidos === sucessosExatos) {
        let probComb =
          Math.pow(probSucesso, s) *
          Math.pow(probCancela, c) *
          Math.pow(probNeutro, neutros) *
          combinacaoMultinomial(n, s, c, neutros);
        total += probComb;
      }
    }
  }

  return total;
}

/**
 * Calcula o coeficiente multinomial para distribuição de n elementos em 3 grupos.
 * @param {number} n - Total de elementos
 * @param {number} s - Quantidade de sucessos
 * @param {number} c - Quantidade de cancelamentos
 * @param {number} neutros - Quantidade de neutros
 * @returns {number} Coeficiente multinomial n! / (s! * c! * neutros!)
 * @customfunction
 */
function combinacaoMultinomial(n, s, c, neutros) {
  return fatorial(n) / (fatorial(s) * fatorial(c) * fatorial(neutros));
}

/**
 * Calcula o fatorial de um número.
 * @param {number} x - Número para calcular o fatorial
 * @returns {number} Fatorial de x (x!)
 * @customfunction
 */
function fatorial(x) {
  if (x < 0) return 0;
  if (x === 0 || x === 1) return 1;

  let resultado = 1;
  for (let i = 2; i <= x; i++) {
    resultado *= i;
  }
  return resultado;
}

// ==================== SISTEMA 2: APENAS 6 É SUCESSO ====================

/**
 * Calcula a probabilidade de obter pelo menos X resultados 6 em uma rolagem de dados d6.
 * @param {number} n - Número de dados a rolar
 * @param {number} minSucessos - Quantidade mínima de resultados 6 desejados
 * @returns {number} Probabilidade de sucesso (0 a 1)
 * @customfunction
 */
function probabilidadeSeisSucessos(n, minSucessos) {
  const p = 1 / 6;
  if (minSucessos <= 0) return 1;
  if (n < minSucessos) return 0;

  let probAcumulada = 0;
  for (let i = 0; i < minSucessos; i++) {
    probAcumulada += binomialPMF(i, n, p);
  }
  return 1 - probAcumulada;
}

/**
 * Calcula a probabilidade de não obter nenhum resultado 6 em uma rolagem de dados d6.
 * @param {number} n - Número de dados a rolar
 * @returns {number} Probabilidade de zero 6s (0 a 1)
 * @customfunction
 */
function probabilidadeZeroSeis(n) {
  return Math.pow(5 / 6, n);
}

// ==================== SISTEMA 3: MENOR VALOR COM THRESHOLD ====================

/**
 * Calcula a probabilidade de todos os dados terem resultado >= threshold (keep lowest sucesso).
 * @param {number} n - Número de dados a rolar
 * @param {number} threshold - Valor mínimo para sucesso (2 a 6)
 * @returns {number} Probabilidade de sucesso (0 a 1)
 * @customfunction
 */
function probabilidadeMenorValorThreshold(n, threshold) {
  let p_sucesso = (7 - threshold) / 6;
  return Math.pow(p_sucesso, n);
}

/**
 * Calcula a probabilidade de pelo menos um dado ter resultado < threshold (keep lowest fracasso).
 * @param {number} n - Número de dados a rolar
 * @param {number} threshold - Valor mínimo para sucesso (2 a 6)
 * @returns {number} Probabilidade de fracasso (0 a 1)
 * @customfunction
 */
function probabilidadeMenorValorFracasso(n, threshold) {
  return 1 - probabilidadeMenorValorThreshold(n, threshold);
}

// ==================== SISTEMA 4: MENOR VALOR APENAS 6 ====================

/**
 * Calcula a probabilidade de todos os dados terem resultado 6 (keep lowest = 6).
 * @param {number} n - Número de dados a rolar
 * @returns {number} Probabilidade de todos serem 6 (0 a 1)
 * @customfunction
 */
function probabilidadeMenorValorTodosSeis(n) {
  let p_seis = 1 / 6;
  return Math.pow(p_seis, n);
}

/**
 * Calcula a probabilidade de pelo menos um dado não ter resultado 6 (keep lowest < 6).
 * @param {number} n - Número de dados a rolar
 * @returns {number} Probabilidade de fracasso (0 a 1)
 * @customfunction
 */
function probabilidadeMenorValorNaoSeis(n) {
  return 1 - probabilidadeMenorValorTodosSeis(n);
}

// ==================== SISTEMA 5: MULTI-DADO COM CANCELAMENTO (d6/d8/d10/d12) ====================

/**
 * Retorna as probabilidades de sucesso, cancelamento e neutro para um dado de N lados.
 * Sucesso: faces 6 até lados | Cancelamento: face 1 | Neutro: faces 2-5
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @returns {Object} Objeto com probabilidades {sucesso, cancela, neutro}
 * @customfunction
 */
function getProbabilidadesMultiDado(lados) {
  if (![6, 8, 10, 12].includes(lados)) {
    throw new Error("Apenas dados d6, d8, d10 ou d12 são suportados.");
  }
  return {
    sucesso: (lados - 5) / lados, // faces 6 até lados
    cancela: 1 / lados, // face 1
    neutro: 4 / lados, // faces 2, 3, 4, 5
  };
}

/**
 * Calcula a probabilidade de obter pelo menos X sucessos líquidos com dados de N lados.
 * Sucesso: resultado >= 6 | Cancelamento: resultado = 1 | Neutro: 2-5
 * Sucessos líquidos = max(0, sucessos - cancelamentos)
 * @param {number} n - Número de dados a rolar
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @param {number} sucessosMinimos - Quantidade mínima de sucessos líquidos desejados
 * @returns {number} Probabilidade de sucesso (0 a 1)
 * @customfunction
 */
function probabilidadeSucessosMultiDado(n, lados, sucessosMinimos) {
  if (sucessosMinimos <= 0) return 1;
  if (sucessosMinimos > n) return 0;

  const probs = getProbabilidadesMultiDado(lados);
  let total = 0;

  for (let s = 0; s <= n; s++) {
    for (let c = 0; c <= n - s; c++) {
      let neutros = n - s - c;
      if (neutros < 0) continue;

      let sucessosLiquidos = Math.max(0, s - c);

      if (sucessosLiquidos >= sucessosMinimos) {
        let probComb =
          Math.pow(probs.sucesso, s) *
          Math.pow(probs.cancela, c) *
          Math.pow(probs.neutro, neutros) *
          combinacaoMultinomial(n, s, c, neutros);
        total += probComb;
      }
    }
  }

  return total;
}

/**
 * Calcula a probabilidade de obter exatamente X sucessos líquidos com dados de N lados.
 * Sucesso: resultado >= 6 | Cancelamento: resultado = 1 | Neutro: 2-5
 * Sucessos líquidos = max(0, sucessos - cancelamentos)
 * @param {number} n - Número de dados a rolar
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @param {number} sucessosExatos - Quantidade exata de sucessos líquidos desejados
 * @returns {number} Probabilidade de obter exatamente esse número de sucessos (0 a 1)
 * @customfunction
 */
function probabilidadeExatosSucessosMultiDado(n, lados, sucessosExatos) {
  if (sucessosExatos < 0 || sucessosExatos > n) return 0;

  const probs = getProbabilidadesMultiDado(lados);
  let total = 0;

  for (let s = 0; s <= n; s++) {
    for (let c = 0; c <= n - s; c++) {
      let neutros = n - s - c;
      if (neutros < 0) continue;

      let sucessosLiquidos = Math.max(0, s - c);

      if (sucessosLiquidos === sucessosExatos) {
        let probComb =
          Math.pow(probs.sucesso, s) *
          Math.pow(probs.cancela, c) *
          Math.pow(probs.neutro, neutros) *
          combinacaoMultinomial(n, s, c, neutros);
        total += probComb;
      }
    }
  }

  return total;
}

// ==================== SISTEMA 6: MULTI-DADO SEM CANCELAMENTO (d6/d8/d10/d12) ====================

/**
 * Retorna a probabilidade de sucesso para um dado de N lados (resultado >= 6).
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @returns {number} Probabilidade de sucesso por dado (0 a 1)
 * @customfunction
 */
function getProbSucessoMultiDado(lados) {
  if (![6, 8, 10, 12].includes(lados)) {
    throw new Error("Apenas dados d6, d8, d10 ou d12 são suportados.");
  }
  return (lados - 5) / lados;
}

/**
 * Calcula a probabilidade de obter pelo menos X sucessos sem cancelamento.
 * Sucesso: resultado >= 6
 * @param {number} n - Número de dados a rolar
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @param {number} sucessosMinimos - Quantidade mínima de sucessos desejados
 * @returns {number} Probabilidade de sucesso (0 a 1)
 * @customfunction
 */
function probabilidadeSucessosSemCancelamento(n, lados, sucessosMinimos) {
  if (sucessosMinimos <= 0) return 1;
  if (n < sucessosMinimos) return 0;

  const p = getProbSucessoMultiDado(lados);

  let probAcumulada = 0;
  for (let i = 0; i < sucessosMinimos; i++) {
    probAcumulada += binomialPMF(i, n, p);
  }
  return 1 - probAcumulada;
}

/**
 * Calcula a probabilidade de obter exatamente X sucessos sem cancelamento.
 * Sucesso: resultado >= 6
 * @param {number} n - Número de dados a rolar
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @param {number} sucessosExatos - Quantidade exata de sucessos desejados
 * @returns {number} Probabilidade de obter exatamente esse número de sucessos (0 a 1)
 * @customfunction
 */
function probabilidadeExatosSucessosSemCancelamento(n, lados, sucessosExatos) {
  if (sucessosExatos < 0 || sucessosExatos > n) return 0;

  const p = getProbSucessoMultiDado(lados);
  return binomialPMF(sucessosExatos, n, p);
}

// ==================== SISTEMA 7: KEEP LOWEST COM STEP DICE (d6/d8/d10/d12) ====================

/**
 * Calcula a probabilidade de sucesso (1 sucesso) ao manter o menor valor de n dados.
 * Sucesso ocorre quando o menor valor é ≥ 6 (todos os dados mostram ≥ 6).
 * @param {number} n - Número de dados a rolar
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @returns {number} Probabilidade de sucesso (0 a 1)
 * @customfunction
 */
function probabilidadeKeepLowestSucesso(n, lados) {
  const p = getProbSucessoMultiDado(lados);
  return Math.pow(p, n);
}

/**
 * Calcula a probabilidade de fracasso (0 sucessos) ao manter o menor valor de n dados.
 * Fracasso ocorre quando o menor valor é < 6.
 * @param {number} n - Número de dados a rolar
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @returns {number} Probabilidade de fracasso (0 a 1)
 * @customfunction
 */
function probabilidadeKeepLowestFracasso(n, lados) {
  return 1 - probabilidadeKeepLowestSucesso(n, lados);
}

// ==================== SISTEMA 8: MÉDIA DE SUCESSOS COM CANCELAMENTO (d6/d8/d10/d12) ====================

/**
 * Calcula a média (esperança matemática) de sucessos líquidos de uma rolagem.
 * Sucesso: resultado ≥ 6 | Cancelamento: resultado = 1 | Neutro: 2-5
 * Sucessos líquidos = max(0, sucessos - cancelamentos)
 * @param {number} n - Número de dados a rolar
 * @param {number} lados - Número de lados do dado (6, 8, 10 ou 12)
 * @returns {number} Média de sucessos líquidos
 * @customfunction
 */
function mediaSucessosMultiDado(n, lados) {
  if (n <= 0) return 0;

  const probs = getProbabilidadesMultiDado(lados);
  let mediaTotal = 0;

  for (let s = 0; s <= n; s++) {
    for (let c = 0; c <= n - s; c++) {
      let neutros = n - s - c;
      if (neutros < 0) continue;

      let sucessosLiquidos = Math.max(0, s - c);

      let probComb =
        Math.pow(probs.sucesso, s) *
        Math.pow(probs.cancela, c) *
        Math.pow(probs.neutro, neutros) *
        combinacaoMultinomial(n, s, c, neutros);

      mediaTotal += sucessosLiquidos * probComb;
    }
  }

  return mediaTotal;
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Calcula a função massa de probabilidade binomial P(X = k).
 * @param {number} k - Número de sucessos
 * @param {number} n - Número de tentativas
 * @param {number} p - Probabilidade de sucesso por tentativa
 * @returns {number} Probabilidade de exatamente k sucessos
 * @customfunction
 */
function binomialPMF(k, n, p) {
  return Math.pow(p, k) * Math.pow(1 - p, n - k) * combinacao(n, k);
}

/**
 * Calcula a função distribuição acumulada binomial P(X <= k).
 * @param {number} k - Número máximo de sucessos
 * @param {number} n - Número de tentativas
 * @param {number} p - Probabilidade de sucesso por tentativa
 * @returns {number} Probabilidade de no máximo k sucessos
 * @customfunction
 */
function binomialCDF(k, n, p) {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += binomialPMF(i, n, p);
  }
  return sum;
}

/**
 * Calcula o coeficiente binomial (n choose k).
 * @param {number} n - Total de elementos
 * @param {number} k - Elementos a escolher
 * @returns {number} Coeficiente binomial C(n,k)
 * @customfunction
 */
function combinacao(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  k = Math.min(k, n - k);
  let resultado = 1;
  for (let i = 1; i <= k; i++) {
    resultado *= (n - k + i) / i;
  }
  return Math.round(resultado);
}
