# Sistema de Cálculo Nutricional y Etiquetado (Argentina)

## 1. Arquitectura del Sistema

### 1.1 Base de Datos (Módulos)
El sistema utiliza una estructura modular para garantizar escalabilidad hacia aplicaciones Web o Power Apps:

- **Materias Primas (Ingredients):** Tabla central con valores nutricionales cada 100g. Campos: Energía, Carbohidratos (Totales/Azúcares), Proteínas, Grasas (Totales/Saturadas/Trans), Fibra y Sodio.
- **Recetas (Recipes):** Define la composición. Campos: ID, Nombre, Lista de Ingredientes (ID + Gramos), Tamaño de Porción, Rendimiento Inicial, Rendimiento Final.
- **Valores Diarios (VD):** Constantes basadas en una dieta de 2000 kcal según el Código Alimentario Argentino (CAA).

### 1.2 Motor de Cálculo
El núcleo del sistema procesa las fórmulas en el siguiente orden:

1.  **Cálculo de Aportes:** Para cada ingrediente, se aplica `(ValorNutriente_100g * GramosIngrediente) / 100`.
2.  **Suma de Totales:** Consolidación de todos los ingredientes de la formulación básica.
3.  **Ajuste por Merma:** Se aplica un factor de corrección `RendimientoFinal / RendimientoInicial` para contemplar pérdidas por cocción o mermas operativas.
4.  **Porcionado:** Los valores totales ajustados se dividen por el número de porciones teóricas (`RendimientoFinal / TamañoPorción`).

---

## 2. Cumplimiento Normativo (Ley 27.642)

El sistema analiza automáticamente los **sellos de advertencia (octógonos)** basándose en el 100% de la composición final (etapa 2 de la ley):

-   **Exceso en Azúcares:** Si las calorías de los azúcares ≥ 10% de las calorías totales.
-   **Exceso en Grasas Totales:** Si las calorías de las grasas ≥ 30% de las calorías totales.
-   **Exceso en Grasas Saturadas:** Si las calorías de las grasas saturadas ≥ 10% de las calorías totales.
-   **Exceso en Sodio:** Si hay ≥ 1mg de sodio por cada 1 kcal, O si el sodio es ≥ 300mg/100g.
-   **Exceso en Calorías:** Aplicable solo si el producto excede algún nutriente crítico anterior, y supera las 275 kcal/100g (sólidos).

---

## 3. Ejemplo de Cálculo: Helado de Crema con Chocolate

**Receta:**
- Leche Entera: 500g
- Crema de Leche: 250g
- Azúcar Blanco: 180g
- Leche en Polvo Descr.: 40g
- Chocolate Amargo: 100g
- **Total Inicial:** 1070g
- **Rendimiento Final:** 1000g (ajustado por aireación/merma)

**Resultado del Motor:**
- La alta concentración de crema y chocolate dispara el sello de **"Exceso en Grasas Saturadas"** y **"Exceso en Grasas Totales"**.
- El azúcar incorporado (180g en 1000g final) supera ampliamente el 10% calórico, activando el sello de **"Exceso en Azúcares"**.
- Al superar los 275 kcal/100g y tener sellos previos, también se aplica el sello de **"Exceso en Calorías"**.

---

## 4. Flujo de Usuario Recomendado

1.  **Carga:** El usuario carga o selecciona los ingredientes de la base de datos.
2.  **Ajuste:** Define el tamaño de porción (ej. 60g) y el rendimiento final esperado.
3.  **Validación:** El sistema muestra en tiempo real los octógonos que aparecerán en el frente del envase.
4.  **Generación:** Se exporta el bloque de texto legalmente válido para la etiqueta y la tabla nutricional.
