// js/semantic.js
import { SymbolTable } from "./symbolTable.js";

export function semanticAnalyzer(ast) {
  const symbolTable = new SymbolTable();
  const errors = [];
  const outputs = []; // Aquí se guardan los resultados de Console.Log()

  // Recorre cada sentencia del árbol
  for (const node of ast.body) {
    try {
      visitNode(node);
    } catch (err) {
      errors.push(err);
    }
  }

  function visitNode(node) {
    switch (node.type) {
      case "VariableDeclaration":
        handleDeclaration(node);
        break;
      case "AssignmentExpression":
        handleAssignment(node);
        break;
      case "PrintStatement":
        handlePrint(node);
        break;
    }
  }

  // 1. Validar y registrar declaraciones (ej. float x, y;)
  function handleDeclaration(node) {
    for (const decl of node.declarations) {
      let initVal = null;
      let initType = node.dataType;

      if (decl.init) {
        const evaluated = evaluateExpression(decl.init, node.line);
        initVal = evaluated.value;
        initType = evaluated.type;

        if (!isTypeCompatible(node.dataType, initType)) {
          throw {
            phase: "Semántico",
            message: `Incompatibilidad de tipos: no se puede asignar '${initType}' a '${decl.id}' de tipo '${node.dataType}' en línea ${decl.line}`,
          };
        }
      }

      const inserted = symbolTable.insert(
        decl.id,
        node.dataType,
        decl.line,
        initVal,
      );
      if (!inserted) {
        throw {
          phase: "Semántico",
          message: `Identificador duplicado: la variable '${decl.id}' ya fue declarada anteriormente (línea ${decl.line})`,
        };
      }
    }
  }

  // 2. Validar asignaciones y calcular el resultado (ej. x = (1 + 5) * 20 / 5;)
  function handleAssignment(node) {
    const symbol = symbolTable.lookup(node.id, node.line);

    if (!symbol) {
      throw {
        phase: "Semántico",
        message: `Identificador no declarado: '${node.id}' en línea ${node.line}`,
      };
    }

    const exprResult = evaluateExpression(node.value, node.line);

    if (!isTypeCompatible(symbol.type, exprResult.type)) {
      throw {
        phase: "Semántico",
        message: `No se puede asignar un valor de tipo '${exprResult.type}' a la variable '${node.id}' (${symbol.type}) en línea ${node.line}`,
      };
    }

    // Si la variable es int y el resultado tuvo decimales (ej. división), truncamos a entero
    const finalValue =
      symbol.type === "int" ? Math.trunc(exprResult.value) : exprResult.value;
    symbolTable.updateValue(node.id, finalValue, node.line);
  }

  // 3. Evaluar Console.Log(...) y guardar el resultado para mostrarlo
  function handlePrint(node) {
    const result = evaluateExpression(node.expression, node.line);
    outputs.push(result.value);
  }

  // 4. Evaluador de expresiones y comprobador de tipos
  function evaluateExpression(expr, line) {
    if (expr.type === "Literal") {
      return { type: expr.dataType, value: expr.value };
    }

    if (expr.type === "Identifier") {
      const symbol = symbolTable.lookup(expr.name, line);
      if (!symbol) {
        throw {
          phase: "Semántico",
          message: `Identificador no declarado: '${expr.name}' en línea ${line}`,
        };
      }
      return { type: symbol.type, value: symbol.value };
    }

    if (expr.type === "BinaryExpression") {
      const left = evaluateExpression(expr.left, line);
      const right = evaluateExpression(expr.right, line);

      // Regla semántica: No se pueden operar booleanos ni cadenas en sumas/multiplicaciones matemáticas
      if (
        left.type === "bool" ||
        right.type === "bool" ||
        left.type === "char" ||
        right.type === "char"
      ) {
        throw {
          phase: "Semántico",
          message: `Operación inválida '${expr.operator}' entre tipos incompatibles ('${left.type}' y '${right.type}') en línea ${line}`,
        };
      }

      // Si alguno es float, el resultado intermedio sube a float
      const resultType =
        left.type === "float" || right.type === "float" ? "float" : "int";

      if (expr.operator === "/" && right.value === 0) {
        throw {
          phase: "Semántico",
          message: `Error matemático: división por cero en línea ${line}`,
        };
      }

      let value = 0;
      switch (expr.operator) {
        case "+":
          value = left.value + right.value;
          break;
        case "-":
          value = left.value - right.value;
          break;
        case "*":
          value = left.value * right.value;
          break;
        case "/":
          value = left.value / right.value;
          break;
      }

      return { type: resultType, value };
    }
  }

  // Compatibilidad de tipos (int acepta int; float acepta float e int)
  function isTypeCompatible(targetType, valueType) {
    if (targetType === valueType) return true;
    if (targetType === "float" && valueType === "int") return true;
    if (targetType === "int" && valueType === "float") return true; // Permitimos conversión implícita truncando
    return false;
  }

  return {
    symbolTable: symbolTable.getAll(),
    errors,
    outputs,
  };
}
