// js/main.js
import { lexicalAnalyzer } from "./lexer.js";

// Referencias a elementos del DOM
const codeInput = document.getElementById("code-input");
const lineNumbers = document.getElementById("line-numbers");
const btnAnalyze = document.getElementById("btn-analyze");
const btnClear = document.getElementById("btn-clear");
const examplesSelect = document.getElementById("examples-select");
const fileUpload = document.getElementById("file-upload");

const tokensBody = document.getElementById("tokens-body");
const consoleErrors = document.getElementById("console-errors");
const consoleOutput = document.getElementById("console-output");

// 1. Ejemplos precargados (basados en los PDFs del profesor)
const examples = {
  valid_math: `int x;\nx = (1 + 5) * 20 / 5;`,
  valid_decl: `float x, y;\nint z;\nz = 10 + 25;\nx = 3.5 * 2;`,
  err_lex: `w = 32 # 5;\nz = {23}{23};`,
  err_sem: `int z;\nz = 1 + 2 * j + 4;`,
};

// 2. Actualizar números de línea en el editor
function updateLineNumbers() {
  const lines = codeInput.value.split("\n").length;
  lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join(
    "<br>",
  );
}

codeInput.addEventListener("input", updateLineNumbers);
codeInput.addEventListener("scroll", () => {
  lineNumbers.scrollTop = codeInput.scrollTop;
});

// 3. Manejo de Pestañas (Resultados y Consola)
function setupTabs(buttonSelector, paneSelector) {
  const buttons = document.querySelectorAll(buttonSelector);
  const panes = document.querySelectorAll(paneSelector);

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      panes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.dataset.tab || btn.dataset.console;
      document.getElementById(targetId).classList.add("active");
    });
  });
}

setupTabs(".tab-btn", ".tab-pane");
setupTabs(".console-tab-btn", ".console-pane");

// 4. Cargar ejemplos y archivos .txt
examplesSelect.addEventListener("change", (e) => {
  const selected = e.target.value;
  if (examples[selected]) {
    codeInput.value = examples[selected];
    updateLineNumbers();
  }
});

fileUpload.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    codeInput.value = event.target.result;
    updateLineNumbers();
  };
  reader.readAsText(file);
});

// 5. Botón Limpiar
btnClear.addEventListener("click", () => {
  codeInput.value = "";
  examplesSelect.value = "";
  updateLineNumbers();
  tokensBody.innerHTML =
    '<tr><td colspan="4" class="empty-msg">Presiona "Analizar Código" para ver los tokens...</td></tr>';
  consoleErrors.innerHTML = '<p class="log-info">Listo para analizar.</p>';
  consoleOutput.innerHTML =
    '<p class="log-info">Aquí se mostrará el resultado de las variables y operaciones evaluadas.</p>';
});

// 6. Botón Analizar (Por ahora ejecuta la Fase 1: Léxico)
btnAnalyze.addEventListener("click", () => {
  const sourceCode = codeInput.value;

  if (!sourceCode.trim()) {
    consoleErrors.innerHTML =
      '<p class="log-warning">⚠ Escribe algún código antes de analizar.</p>';
    return;
  }

  // Ejecutar Analizador Léxico
  const lexResult = lexicalAnalyzer(sourceCode);
  renderTokens(lexResult.tokens);

  // Mostrar estado en consola
  consoleErrors.innerHTML = "";
  if (lexResult.errors.length > 0) {
    lexResult.errors.forEach((err) => {
      consoleErrors.innerHTML += `<p class="log-error">✖ [Error ${err.phase}]: ${err.message}</p>`;
    });
  } else {
    consoleErrors.innerHTML = `<p class="log-success">✔ Análisis Léxico completado sin errores (${lexResult.tokens.length} tokens encontrados).</p>`;
  }
});

// 7. Renderizar tabla de tokens
function renderTokens(tokens) {
  if (tokens.length === 0) {
    tokensBody.innerHTML =
      '<tr><td colspan="4" class="empty-msg">No se encontraron tokens válidos.</td></tr>';
    return;
  }

  tokensBody.innerHTML = tokens
    .map(
      (t) => `
        <tr>
            <td><strong>${t.type}</strong></td>
            <td><code>${t.lexeme}</code></td>
            <td>${t.line}</td>
            <td>${t.column}</td>
        </tr>
    `,
    )
    .join("");
}
