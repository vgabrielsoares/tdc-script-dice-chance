// ==================== SISTEMA 1: COM CANCELAMENTOS ====================
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

function combinacaoMultinomial(n, s, c, neutros) {
  return fatorial(n) / (fatorial(s) * fatorial(c) * fatorial(neutros));
}

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

function probabilidadeZeroSeis(n) {
  return Math.pow(5 / 6, n);
}

// ==================== SISTEMA 3: MENOR VALOR COM THRESHOLD ====================
function probabilidadeMenorValorThreshold(n, threshold) {
  let p_sucesso = (7 - threshold) / 6;
  return Math.pow(p_sucesso, n);
}

function probabilidadeMenorValorFracasso(n, threshold) {
  return 1 - probabilidadeMenorValorThreshold(n, threshold);
}

// ==================== SISTEMA 4: MENOR VALOR APENAS 6 ====================
function probabilidadeMenorValorTodosSeis(n) {
  let p_seis = 1 / 6;
  return Math.pow(p_seis, n);
}

function probabilidadeMenorValorNaoSeis(n) {
  return 1 - probabilidadeMenorValorTodosSeis(n);
}

// ==================== SISTEMA 5: MULTI-DADO COM CANCELAMENTO (d6/d8/d10/d12) ====================

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

function getProbSucessoMultiDado(lados) {
  if (![6, 8, 10, 12].includes(lados)) {
    throw new Error("Apenas dados d6, d8, d10 ou d12 são suportados.");
  }
  return (lados - 5) / lados;
}

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

function probabilidadeExatosSucessosSemCancelamento(n, lados, sucessosExatos) {
  if (sucessosExatos < 0 || sucessosExatos > n) return 0;

  const p = getProbSucessoMultiDado(lados);
  return binomialPMF(sucessosExatos, n, p);
}

// ==================== FUNÇÕES AUXILIARES ====================
function binomialPMF(k, n, p) {
  return Math.pow(p, k) * Math.pow(1 - p, n - k) * combinacao(n, k);
}

function binomialCDF(k, n, p) {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += binomialPMF(i, n, p);
  }
  return sum;
}

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
