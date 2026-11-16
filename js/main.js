// js/main.js
import { lexicalAnalyzer } from "./lexer.js";
import { syntacticAnalyzer } from "./parser.js";
import { semanticAnalyzer } from "./semantic.js";

// Referencias a elementos del DOM
const codeInput = document.getElementById("code-input");
const lineNumbers = document.getElementById("line-numbers");
const btnAnalyze = document.getElementById("btn-analyze");
const btnClear = document.getElementById("btn-clear");
const examplesSelect = document.getElementById("examples-select");
const fileUpload = document.getElementById("file-upload");

const tokensBody = document.getElementById("tokens-body");
const astContainer = document.getElementById("ast-container");
const symbolsBody = document.getElementById("symbols-body");

const consoleErrors = document.getElementById("console-errors");
const consoleOutput = document.getElementById("console-output");

// 1. Ejemplos precargados completos (con declaraciones, operaciones y Console.Log)
const examples = {
  valid_math: `int x;\nx = (1 + 5) * 20 / 5;\nConsole.Log(x);`,
  valid_decl: `float x, y;\nint z;\nz = 10 + 25;\nx = 3.5 * 2;\nConsole.Log(z);\nConsole.Log(x);`,
  err_lex: `w = 32 # 5;\nz = {23}{23};`,
  err_sem: `int z;\nz = 1 + 2 * j + 4;\nConsole.Log(z);`,
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

// 3. Manejo de Pestañas
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
  astContainer.innerHTML =
    '<p class="empty-msg">El árbol sintáctico aparecerá aquí...</p>';
  symbolsBody.innerHTML =
    '<tr><td colspan="6" class="empty-msg">La tabla de símbolos aparecerá aquí...</td></tr>';
  consoleErrors.innerHTML = '<p class="log-info">Listo para analizar.</p>';
  consoleOutput.innerHTML =
    '<p class="log-info">Aquí se mostrará el resultado de las variables y operaciones evaluadas.</p>';
});

// 6. Botón Analizar: Ejecuta la Tubería Completa (Léxico ➔ Sintáctico ➔ Semántico)
btnAnalyze.addEventListener("click", () => {
  const sourceCode = codeInput.value;

  if (!sourceCode.trim()) {
    consoleErrors.innerHTML =
      '<p class="log-warning">⚠ Escribe algún código antes de analizar.</p>';
    return;
  }

  // --- FASE 1: ANÁLISIS LÉXICO ---
  const lexResult = lexicalAnalyzer(sourceCode);
  renderTokens(lexResult.tokens);

  if (lexResult.errors.length > 0) {
    renderErrors(lexResult.errors);
    clearResultsOnFailure();
    return;
  }

  // --- FASE 2: ANÁLISIS SINTÁCTICO ---
  const parseResult = syntacticAnalyzer(lexResult.tokens);
  renderAST(parseResult.ast);

  if (parseResult.errors.length > 0) {
    renderErrors(parseResult.errors);
    symbolsBody.innerHTML =
      '<tr><td colspan="6" class="empty-msg">Bloqueado por errores sintácticos.</td></tr>';
    return;
  }

  // --- FASE 3: ANÁLISIS SEMÁNTICO Y EVALUADOR ---
  const semanticResult = semanticAnalyzer(parseResult.ast);
  renderSymbolTable(semanticResult.symbolTable);
  renderOutputs(semanticResult.outputs);

  if (semanticResult.errors.length > 0) {
    renderErrors(semanticResult.errors);
  } else {
    consoleErrors.innerHTML = `
            <p class="log-success">✔ Compilación y análisis exitoso (Léxico, Sintáctico y Semántico sin errores).</p>
        `;
  }
});

// --- RENDERIZADORES EN HTML ---

function renderTokens(tokens) {
  if (tokens.length === 0) {
    tokensBody.innerHTML =
      '<tr><td colspan="4" class="empty-msg">No se encontraron tokens.</td></tr>';
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

function renderAST(node) {
  const tree = document.createElement("ul");
  tree.className = "ast-list";
  tree.append(createASTNode(node));
  astContainer.replaceChildren(tree);
}

function createASTNode(node, relationship = "") {
  const item = document.createElement("li");
  item.className = "ast-node-item";

  const details = document.createElement("details");
  details.className = "ast-node";
  details.open = true;

  const summary = document.createElement("summary");
  const title = document.createElement("span");
  title.className = "ast-label";
  title.textContent = getASTNodeLabel(node);
  summary.append(title);

  if (relationship) {
    const branch = document.createElement("span");
    branch.className = "ast-branch-label";
    branch.textContent = relationship;
    summary.prepend(branch);
  }

  const metadataKeys = ["id", "name", "operator", "dataType", "value", "line"];
  for (const key of metadataKeys) {
    if (
      node[key] === undefined ||
      node[key] === null ||
      typeof node[key] === "object"
    ) {
      continue;
    }

    const metadata = document.createElement("span");
    metadata.className = `ast-value ast-value-${key}`;
    metadata.textContent = getASTMetadataLabel(key, node[key]);
    summary.append(metadata);
  }

  details.append(summary);

  const childGroups = Object.entries(node).filter(
    ([key, value]) =>
      key !== "type" &&
      value !== null &&
      typeof value === "object",
  );

  if (childGroups.length > 0) {
    const children = document.createElement("ul");
    children.className = "ast-children";

    for (const [key, value] of childGroups) {
      const values = Array.isArray(value) ? value : [value];
      for (const child of values) {
        children.append(createASTNode(child, getASTRelationship(key)));
      }
    }

    details.append(children);
  }

  item.append(details);
  return item;
}

function getASTNodeLabel(node) {
  const labels = {
    Program: "Programa",
    VariableDeclaration: "Declaración de variables",
    AssignmentExpression: "Asignación",
    PrintStatement: "Impresión",
    BinaryExpression: "Operación",
    Literal: "Literal",
    Identifier: "Variable",
  };

  return labels[node.type] || (node.id ? "Declaración" : node.type);
}

function getASTRelationship(key) {
  const labels = {
    body: "Sentencia",
    declarations: "Variable",
    init: "Valor inicial",
    value: "Valor",
    expression: "Expresión",
    left: "Operando izquierdo",
    right: "Operando derecho",
  };

  return labels[key] || key;
}

function getASTMetadataLabel(key, value) {
  const labels = {
    id: "nombre",
    name: "nombre",
    operator: "operador",
    dataType: "tipo",
    value: "valor",
    line: "línea",
  };

  return `${labels[key]}: ${String(value)}`;
}

function renderSymbolTable(symbols) {
  if (symbols.length === 0) {
    symbolsBody.innerHTML =
      '<tr><td colspan="6" class="empty-msg">No hay variables declaradas.</td></tr>';
    return;
  }

  // Columnas exactas de la diapositiva de la Tabla de Símbolos del profesor:
  // # | Nombre de Variable | Tipo | Valor | Línea Declaración | Líneas Referenciada
  symbolsBody.innerHTML = symbols
    .map(
      (s) => `
        <tr>
            <td>${s.index}</td>
            <td><strong>${s.name}</strong></td>
            <td><code>${s.type}</code></td>
            <td><code>${s.value}</code></td>
            <td>${s.declaredLine}</td>
            <td>${s.references.length > 0 ? s.references.join(", ") : "Ninguna"}</td>
        </tr>
    `,
    )
    .join("");
}

function renderOutputs(outputs) {
  if (outputs.length === 0) {
    consoleOutput.innerHTML =
      '<p class="log-info">El programa no ejecutó ninguna instrucción Console.Log().</p>';
    return;
  }

  consoleOutput.innerHTML = outputs
    .map(
      (val) => `
        <p class="log-success">> Salida de ejecución: <strong>${val}</strong></p>
    `,
    )
    .join("");
}

function renderErrors(errors) {
  consoleErrors.innerHTML = "";
  errors.forEach((err) => {
    consoleErrors.innerHTML += `<p class="log-error">✖ [Error ${err.phase}]: ${err.message}</p>`;
  });
}

function clearResultsOnFailure() {
  astContainer.innerHTML =
    '<p class="empty-msg">Detenido por errores léxicos.</p>';
  symbolsBody.innerHTML =
    '<tr><td colspan="6" class="empty-msg">Detenido por errores léxicos.</td></tr>';
  consoleOutput.innerHTML = '<p class="log-info">Sin salida de código.</p>';
}
