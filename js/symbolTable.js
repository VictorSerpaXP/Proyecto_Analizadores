// js/symbolTable.js

export class SymbolTable {
  constructor() {
    // Usamos Map (Tabla Hash) por su eficiencia en inserción y búsqueda
    this.symbols = new Map();
    this.counter = 1;
  }

  // Inserta una nueva variable declarada
  insert(name, type, line, initialValue = null, isArray = false) {
    if (this.symbols.has(name)) {
      return false; // Error: ya fue declarada previamente
    }

    this.symbols.set(name, {
      index: this.counter++,
      name: name,
      type: type,
      value: initialValue !== null ? initialValue : this.getDefaultValue(type),
      isArray,
      declaredLine: line,
      references: [], // Líneas donde se usa la variable
    });

    return true;
  }

  // Busca una variable y opcionalmente registra la línea donde fue referenciada
  lookup(name, referenceLine = null) {
    const entry = this.symbols.get(name);
    if (!entry) return null;

    if (referenceLine !== null && !entry.references.includes(referenceLine)) {
      entry.references.push(referenceLine);
    }

    return entry;
  }

  // Actualiza el valor de una variable tras una asignación
  updateValue(name, newValue, referenceLine) {
    const entry = this.lookup(name, referenceLine);
    if (entry) {
      entry.value = newValue;
    }
  }

  updateArrayElement(name, index, newValue, referenceLine) {
    const entry = this.lookup(name, referenceLine);
    if (entry) {
      entry.value[index] = newValue;
    }
  }

  getDefaultValue(type) {
    switch (type) {
      case "int":
        return 0;
      case "float":
        return 0.0;
      case "bool":
        return false;
      case "char":
        return "";
      default:
        return null;
    }
  }

  // Devuelve todas las entradas en forma de arreglo para pintar la tabla HTML
  getAll() {
    return Array.from(this.symbols.values());
  }
}
