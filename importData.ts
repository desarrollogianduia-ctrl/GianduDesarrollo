
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs
} from "firebase/firestore";
import fs from "fs";

const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

const fileName = process.argv[2] || "./recipes_import.json";
if (!fs.existsSync(fileName)) {
  console.error(`File not found: ${fileName}`);
  process.exit(1);
}
const recipesData = JSON.parse(fs.readFileSync(fileName, "utf-8"));

async function importData() {
  console.log("Starting import...");
  
  const ingSnapshot = await getDocs(collection(db, "ingredients"));
  const existingIngredients = new Map();
  ingSnapshot.forEach(doc => {
    existingIngredients.set(doc.data().name.toLowerCase(), doc.id);
  });

  for (const recipe of recipesData) {
    const recipeIngredients = [];
    
    for (const ing of recipe.ingredients) {
      let ingId;
      const lowerName = ing.name.toLowerCase();
      
      if (existingIngredients.has(lowerName)) {
        ingId = existingIngredients.get(lowerName);
      } else {
        ingId = `ing_${Math.random().toString(36).substr(2, 9)}`;
        const newIng = {
          id: ingId,
          name: ing.name,
          energy: 0, carbs: 0, sugars: 0, proteins: 0, totalFats: 0,
          saturatedFats: 0, transFats: 0, fiber: 0, sodium: 0,
          category: "especifico",
          isGlutenFree: false
        };
        await setDoc(doc(db, "ingredients", ingId), newIng);
        existingIngredients.set(lowerName, ingId);
        console.log(`  Created ingredient: ${ing.name}`);
      }
      
      recipeIngredients.push({
        ingredientId: ingId,
        amount: ing.amount || 0,
        note: ing.unit || ""
      });
    }
    
    const recipeId = `rec_${Math.random().toString(36).substr(2, 9)}`;
    const newRecipe = {
      id: recipeId,
      name: recipe.name,
      type: "semielaborado",
      category: (recipe.category?.toLowerCase() || "semielaborado"),
      ingredients: recipeIngredients,
      servingSize: 100,
      totalYield: recipeIngredients.reduce((sum, i) => sum + i.amount, 0),
      finalYield: recipeIngredients.reduce((sum, i) => sum + i.amount, 0),
      portionsPerPackage: 1,
      status: "formulacion",
      ownerId: "0ef36ce4-a8a3-4115-a6ee-c8dc0768578e",
      createdAt: Date.now()
    };
    
    await setDoc(doc(db, "recipes", recipeId), newRecipe);
    console.log(`Imported recipe: ${recipe.name}`);
  }
  
  console.log("Import finished successfully!");
  process.exit(0);
}

importData().catch(err => {
  console.error(err);
  process.exit(1);
});
