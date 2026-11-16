// js/semantic.js
import { SymbolTable } from "./symbolTable.js";

const MAX_LOOP_ITERATIONS = 10000;
const MAX_ARRAY_LENGTH = 10000;

export function semanticAnalyzer(ast) {
  const symbolTable = new SymbolTable();
  const errors = [];
  const outputs = [];
  let loopIterations = 0;

  for (const node of ast.body) {
    try {
      executeStatement(node);
    } catch (error) {
      errors.push(error);
    }
  }

  function fail(message, line, phase = "Semántico") {
    throw { phase, message, line };
  }

  function executeStatement(node) {
    switch (node.type) {
      case "VariableDeclaration":
        handleDeclaration(node);
        break;
      case "AssignmentExpression":
        handleAssignment(node);
        break;
      case "ArrayAssignment":
        handleArrayAssignment(node);
        break;
      case "PrintStatement":
        handlePrint(node);
        break;
      case "BlockStatement":
        for (const statement of node.body) executeStatement(statement);
        break;
      case "IfStatement":
        executeIf(node);
        break;
      case "WhileStatement":
        executeWhile(node);
        break;
      case "ForStatement":
        executeFor(node);
        break;
      default:
        fail(`Instrucción no soportada '${node.type}'`, node.line || 1);
    }
  }

  function handleDeclaration(node) {
    for (const declaration of node.declarations) {
      if (declaration.isArray) {
        declareArray(node, declaration);
        continue;
      }

      let value = null;
      if (declaration.init) {
        const evaluated = evaluateExpression(declaration.init, declaration.line);
        if (!isTypeCompatible(node.dataType, evaluated.type)) {
          fail(
            `Incompatibilidad de tipos: no se puede asignar '${evaluated.type}' a '${declaration.id}' de tipo '${node.dataType}' en línea ${declaration.line}`,
            declaration.line,
          );
        }
        value = coerceValue(node.dataType, evaluated);
      }

      if (
        !symbolTable.insert(
          declaration.id,
          node.dataType,
          declaration.line,
          value,
        )
      ) {
        fail(
          `Identificador duplicado: la variable '${declaration.id}' ya fue declarada anteriormente (línea ${declaration.line})`,
          declaration.line,
        );
      }
    }
  }

  function declareArray(node, declaration) {
    let size = null;
    if (declaration.arraySize) {
      const evaluatedSize = evaluateExpression(
        declaration.arraySize,
        declaration.line,
      );
      if (evaluatedSize.type !== "int" || !Number.isInteger(evaluatedSize.value)) {
        fail(`El tamaño de '${declaration.id}' debe ser un entero`, declaration.line);
      }
      size = evaluatedSize.value;
      if (size < 0 || size > MAX_ARRAY_LENGTH) {
        fail(
          `El tamaño de '${declaration.id}' debe estar entre 0 y ${MAX_ARRAY_LENGTH}`,
          declaration.line,
        );
      }
    }

    let values;
    if (declaration.init) {
      const initializer = evaluateExpression(declaration.init, declaration.line);
      if (initializer.type !== "array") {
        fail(
          `El arreglo '${declaration.id}' debe inicializarse con una lista entre corchetes`,
          declaration.line,
        );
      }
      if (size !== null && size !== initializer.value.length) {
        fail(
          `El tamaño de '${declaration.id}' es ${size}, pero se proporcionaron ${initializer.value.length} elementos`,
          declaration.line,
        );
      }
      size ??= initializer.value.length;
      if (size > MAX_ARRAY_LENGTH) {
        fail(
          `El tamaño máximo de un arreglo es ${MAX_ARRAY_LENGTH}`,
          declaration.line,
        );
      }

      values = initializer.value.map((value, index) => {
        const elementType = initializer.elementTypes[index];
        if (!isTypeCompatible(node.dataType, elementType)) {
          fail(
            `El elemento ${index} de '${declaration.id}' es de tipo '${elementType}', no '${node.dataType}'`,
            declaration.line,
          );
        }
        return coerceValue(node.dataType, { type: elementType, value });
      });
    } else {
      if (size === null) {
        fail(
          `El tamaño de '${declaration.id}' no puede inferirse sin un arreglo inicial`,
          declaration.line,
        );
      }
      values = Array.from({ length: size }, () =>
        symbolTable.getDefaultValue(node.dataType),
      );
    }

    if (
      !symbolTable.insert(
        declaration.id,
        node.dataType,
        declaration.line,
        values,
        true,
      )
    ) {
      fail(
        `Identificador duplicado: la variable '${declaration.id}' ya fue declarada anteriormente (línea ${declaration.line})`,
        declaration.line,
      );
    }
  }

  function handleAssignment(node) {
    const symbol = symbolTable.lookup(node.id, node.line);
    if (!symbol) {
      fail(`Identificador no declarado: '${node.id}' en línea ${node.line}`, node.line);
    }
    if (symbol.isArray) {
      fail(
        `No se puede asignar un valor directamente al arreglo '${node.id}'; indica un índice`,
        node.line,
      );
    }

    const evaluated = evaluateExpression(node.value, node.line);
    if (!isTypeCompatible(symbol.type, evaluated.type)) {
      fail(
        `No se puede asignar un valor de tipo '${evaluated.type}' a la variable '${node.id}' (${symbol.type}) en línea ${node.line}`,
        node.line,
      );
    }

    symbolTable.updateValue(
      node.id,
      coerceValue(symbol.type, evaluated),
      node.line,
    );
  }

  function handleArrayAssignment(node) {
    const symbol = symbolTable.lookup(node.id, node.line);
    if (!symbol) {
      fail(`Identificador no declarado: '${node.id}' en línea ${node.line}`, node.line);
    }
    if (!symbol.isArray) {
      fail(`'${node.id}' no es un arreglo`, node.line);
    }

    const index = evaluateArrayIndex(node.index, node.line, symbol);
    const evaluated = evaluateExpression(node.value, node.line);
    if (!isTypeCompatible(symbol.type, evaluated.type)) {
      fail(
        `No se puede asignar un valor de tipo '${evaluated.type}' al elemento de tipo '${symbol.type}' en línea ${node.line}`,
        node.line,
      );
    }
    symbolTable.updateArrayElement(
      node.id,
      index,
      coerceValue(symbol.type, evaluated),
      node.line,
    );
  }

  function handlePrint(node) {
    outputs.push(evaluateExpression(node.expression, node.line).value);
  }

  function executeIf(node) {
    if (evaluateCondition(node.condition, node.line)) {
      executeStatement(node.consequent);
    } else if (node.alternate) {
      executeStatement(node.alternate);
    }
  }

  function executeWhile(node) {
    while (evaluateCondition(node.condition, node.line)) {
      consumeLoopIteration(node.line);
      executeStatement(node.body);
    }
  }

  function executeFor(node) {
    if (node.initializer) executeStatement(node.initializer);
    while (
      node.condition === null ||
      evaluateCondition(node.condition, node.line)
    ) {
      consumeLoopIteration(node.line);
      executeStatement(node.body);
      if (node.update) executeStatement(node.update);
    }
  }

  function consumeLoopIteration(line) {
    loopIterations++;
    if (loopIterations > MAX_LOOP_ITERATIONS) {
      fail(
        `Se superó el límite de ${MAX_LOOP_ITERATIONS} iteraciones; revisa la condición del bucle`,
        line,
        "Ejecución",
      );
    }
  }

  function evaluateCondition(expression, line) {
    const result = evaluateExpression(expression, line);
    if (result.type !== "bool") {
      fail(`La condición debe ser de tipo 'bool', no '${result.type}'`, line);
    }
    return result.value;
  }

  function evaluateExpression(expression, line) {
    switch (expression.type) {
      case "Literal":
        return { type: expression.dataType, value: expression.value };
      case "Identifier": {
        const symbol = symbolTable.lookup(expression.name, line);
        if (!symbol) {
          fail(`Identificador no declarado: '${expression.name}' en línea ${line}`, line);
        }
        return {
          type: symbol.isArray ? "array" : symbol.type,
          value: symbol.value,
        };
      }
      case "ArrayAccess":
        return evaluateArrayAccess(expression, line);
      case "ArrayLiteral": {
        const elements = expression.elements.map((element) =>
          evaluateExpression(element, line),
        );
        return {
          type: "array",
          value: elements.map((element) => element.value),
          elementTypes: elements.map((element) => element.type),
        };
      }
      case "UnaryExpression":
        return evaluateUnaryExpression(expression, line);
      case "BinaryExpression":
        return evaluateBinaryExpression(expression, line);
      default:
        fail(`Expresión no soportada '${expression.type}'`, line);
    }
  }

  function evaluateArrayAccess(expression, line) {
    const symbol = symbolTable.lookup(expression.name, line);
    if (!symbol) {
      fail(`Identificador no declarado: '${expression.name}' en línea ${line}`, line);
    }
    if (!symbol.isArray) {
      fail(`'${expression.name}' no es un arreglo`, line);
    }
    const index = evaluateArrayIndex(expression.index, line, symbol);
    return { type: symbol.type, value: symbol.value[index] };
  }

  function evaluateArrayIndex(expression, line, symbol) {
    const result = evaluateExpression(expression, line);
    if (result.type !== "int" || !Number.isInteger(result.value)) {
      fail("El índice de un arreglo debe ser un entero", line);
    }
    if (result.value < 0 || result.value >= symbol.value.length) {
      fail(
        `Índice ${result.value} fuera de los límites del arreglo '${symbol.name}'`,
        line,
      );
    }
    return result.value;
  }

  function evaluateUnaryExpression(expression, line) {
    const operand = evaluateExpression(expression.operand, line);
    if (expression.operator === "!") {
      if (operand.type !== "bool") {
        fail(`El operador '!' requiere un booleano, no '${operand.type}'`, line);
      }
      return { type: "bool", value: !operand.value };
    }
    if (expression.operator === "-") {
      if (!isNumericType(operand.type)) {
        fail(`El operador '-' requiere un número, no '${operand.type}'`, line);
      }
      return { type: operand.type, value: -operand.value };
    }
    fail(`Operador unario no soportado '${expression.operator}'`, line);
  }

  function evaluateBinaryExpression(expression, line) {
    const left = evaluateExpression(expression.left, line);

    if (expression.operator === "&&" || expression.operator === "||") {
      if (left.type !== "bool") {
        fail(
          `El operador '${expression.operator}' requiere operandos booleanos`,
          line,
        );
      }
      if (
        (expression.operator === "&&" && !left.value) ||
        (expression.operator === "||" && left.value)
      ) {
        return { type: "bool", value: left.value };
      }
      const right = evaluateExpression(expression.right, line);
      if (right.type !== "bool") {
        fail(
          `El operador '${expression.operator}' requiere operandos booleanos`,
          line,
        );
      }
      return { type: "bool", value: right.value };
    }

    const right = evaluateExpression(expression.right, line);
    if (expression.operator === "==" || expression.operator === "!=") {
      const comparable =
        (isNumericType(left.type) && isNumericType(right.type)) ||
        left.type === right.type;
      if (!comparable || left.type === "array") {
        fail(
          `No se pueden comparar valores de tipo '${left.type}' y '${right.type}'`,
          line,
        );
      }
      const equal = left.value === right.value;
      return {
        type: "bool",
        value: expression.operator === "==" ? equal : !equal,
      };
    }

    if (
      ["<", "<=", ">", ">="].includes(expression.operator)
    ) {
      if (!isNumericType(left.type) || !isNumericType(right.type)) {
        fail(
          `El operador '${expression.operator}' solo compara valores numéricos`,
          line,
        );
      }
      const comparisons = {
        "<": left.value < right.value,
        "<=": left.value <= right.value,
        ">": left.value > right.value,
        ">=": left.value >= right.value,
      };
      return { type: "bool", value: comparisons[expression.operator] };
    }

    if (!isNumericType(left.type) || !isNumericType(right.type)) {
      fail(
        `Operación inválida '${expression.operator}' entre tipos incompatibles ('${left.type}' y '${right.type}') en línea ${line}`,
        line,
      );
    }
    if (expression.operator === "/" && right.value === 0) {
      fail(`Error matemático: división por cero en línea ${line}`, line);
    }

    const values = {
      "+": left.value + right.value,
      "-": left.value - right.value,
      "*": left.value * right.value,
      "/": left.value / right.value,
    };
    return {
      type:
        expression.operator === "/" ||
        left.type === "float" ||
        right.type === "float"
          ? "float"
          : "int",
      value: values[expression.operator],
    };
  }

  function isNumericType(type) {
    return type === "int" || type === "float";
  }

  function isTypeCompatible(targetType, valueType) {
    if (targetType === valueType) return true;
    return (
      (targetType === "float" || targetType === "int") &&
      (valueType === "float" || valueType === "int")
    );
  }

  function coerceValue(targetType, evaluated) {
    if (targetType === "int" && evaluated.type === "float") {
      return Math.trunc(evaluated.value);
    }
    return evaluated.value;
  }

  return {
    symbolTable: symbolTable.getAll(),
    errors,
    outputs,
  };
}
