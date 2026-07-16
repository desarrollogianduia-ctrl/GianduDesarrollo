import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  query, 
  where, 
  onSnapshot,
  writeBatch,
  FirestoreError
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "./firebase";
import { Ingredient, Recipe, DevelopmentProject, KnowledgeDocument } from "../types";

export const subscribeKnowledgeDocuments = (userId: string, callback: (docs: KnowledgeDocument[]) => void) => {
  const q = query(collection(db, "knowledge"), where("ownerId", "==", userId));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeDocument));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, 'list', 'knowledge');
  });
};

export const saveKnowledgeDocument = async (docObj: KnowledgeDocument, userId: string) => {
  const path = `knowledge/${docObj.id}`;
  try {
    const ref = doc(db, "knowledge", docObj.id);
    const data = cleanData({ ...docObj, ownerId: userId });
    await setDoc(ref, data);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const deleteKnowledgeDocument = async (id: string) => {
  const path = `knowledge/${id}`;
  try {
    const ref = doc(db, "knowledge", id);
    await deleteDoc(ref);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'delete', path);
    throw error;
  }
};

// Firebase Instructions: Dedicated Error Handler
interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write' | 'upload';
  path: string | null;
  authInfo: {
    userId: string | null;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  }
}

const handleFirestoreError = (error: any, operation: FirestoreErrorInfo['operationType'], path: string | null = null) => {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || String(error),
    operationType: operation,
    path: path,
    authInfo: {
      userId: user?.uid || null,
      email: user?.email || null,
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      providerInfo: user?.providerData || []
    }
  };
  console.error("Firebase Error:", errorInfo);
  throw new Error(JSON.stringify(errorInfo));
};

export const uploadFile = async (file: File, folder: string): Promise<string> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileId = `${Date.now()}_${safeName}`;
  const storageRef = ref(storage, `${folder}/${fileId}`);
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    handleFirestoreError(error, 'upload', `${folder}/${fileId}`);
    throw error;
  }
};

export const getIngredients = async (): Promise<Ingredient[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "ingredients"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'list', 'ingredients');
    throw error;
  }
};

export const subscribeIngredients = (callback: (ingredients: Ingredient[]) => void) => {
  return onSnapshot(collection(db, "ingredients"), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, 'list', 'ingredients');
  });
};

export const subscribeRecipes = (userId: string, callback: (recipes: Recipe[]) => void) => {
  const q = query(collection(db, "recipes"), where("ownerId", "==", userId));
  return onSnapshot(q, (snapshot) => {
    const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
    callback(recipes);
  }, (error) => {
    handleFirestoreError(error, 'list', 'recipes');
  });
};

const cleanData = (obj: any): any => {
  const clean: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        clean[key] = cleanData(obj[key]);
      } else if (Array.isArray(obj[key])) {
        clean[key] = obj[key].map(item => typeof item === 'object' && item !== null ? cleanData(item) : item);
      } else {
        clean[key] = obj[key];
      }
    }
  });
  return clean;
};

export const saveRecipe = async (recipe: Recipe, userId: string) => {
  const path = `recipes/${recipe.id}`;
  try {
    const recipeRef = doc(db, "recipes", recipe.id);
    const data = cleanData({ ...recipe, ownerId: userId });
    await setDoc(recipeRef, data);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const saveIngredient = async (ingredient: Ingredient) => {
  const path = `ingredients/${ingredient.id}`;
  try {
    const ingRef = doc(db, "ingredients", ingredient.id);
    const data = cleanData(ingredient);
    await setDoc(ingRef, data);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const deleteRecipe = async (recipeId: string) => {
  const path = `recipes/${recipeId}`;
  try {
    const recipeRef = doc(db, "recipes", recipeId);
    await deleteDoc(recipeRef);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'delete', path);
    throw error;
  }
};

export const deleteIngredient = async (ingredientId: string) => {
  const path = `ingredients/${ingredientId}`;
  try {
    const ingRef = doc(db, "ingredients", ingredientId);
    await deleteDoc(ingRef);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'delete', path);
    throw error;
  }
};

export const mergeIngredients = async (targetId: string, sourceIds: string[], recipes: Recipe[], userId: string) => {
  const batch = writeBatch(db);
  
  // 1. Update recipes that use source ingredients
  recipes.forEach(recipe => {
    let changed = false;
    const modifiedIngredients = recipe.ingredients.map(ri => {
      if (!ri.isRecipe && sourceIds.includes(ri.ingredientId)) {
        changed = true;
        return { ...ri, ingredientId: targetId };
      }
      return ri;
    });
    
    if (changed) {
      // Consolidate if the target was already there or multiple sources were replaced by target
      const consolidated: Record<string, typeof recipe.ingredients[0]> = {};
      modifiedIngredients.forEach(ri => {
        const key = ri.isRecipe ? `rec_${ri.ingredientId}` : `ing_${ri.ingredientId}`;
        if (consolidated[key]) {
          consolidated[key].amount += ri.amount;
        } else {
          consolidated[key] = { ...ri };
        }
      });

      const finalIngredients = Object.values(consolidated);
      const recipeRef = doc(db, "recipes", recipe.id);
      batch.set(recipeRef, cleanData({ ...recipe, ingredients: finalIngredients, ownerId: userId }));
    }
  });
  
  // 2. Delete source ingredients
  sourceIds.forEach(id => {
    const ingRef = doc(db, "ingredients", id);
    batch.delete(ingRef);
  });
  
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'write', 'merge_ingredients');
    throw error;
  }
};

export const subscribeDevelopments = (userId: string, callback: (developments: DevelopmentProject[]) => void) => {
  const q = query(collection(db, "developments"), where("createdBy", "==", userId));
  return onSnapshot(q, (snapshot) => {
    const developments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DevelopmentProject));
    callback(developments);
  }, (error) => {
    handleFirestoreError(error, 'list', 'developments');
  });
};

export const saveDevelopment = async (development: DevelopmentProject, userId: string) => {
  const path = `developments/${development.id}`;
  try {
    const devRef = doc(db, "developments", development.id);
    const data = cleanData({ ...development, createdBy: userId });
    await setDoc(devRef, data);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const deleteDevelopment = async (id: string) => {
  const path = `developments/${id}`;
  try {
    const devRef = doc(db, "developments", id);
    await deleteDoc(devRef);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'delete', path);
    throw error;
  }
};

export const archiveDevelopment = async (id: string) => {
  const path = `developments/${id}`;
  try {
    const devRef = doc(db, "developments", id);
    await setDoc(devRef, { status: 'archivado', updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const unarchiveDevelopment = async (id: string) => {
  const path = `developments/${id}`;
  try {
    const devRef = doc(db, "developments", id);
    await setDoc(devRef, { status: 'finalizado', updatedAt: Date.now() }, { merge: true });
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const reopenDevelopment = async (id: string, userId: string) => {
  const path = `developments/${id}`;
  try {
    const devRef = doc(db, "developments", id);
    await setDoc(devRef, { 
      status: 'en_curso', 
      finishedAt: null, 
      updatedAt: Date.now() 
    }, { merge: true });
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};
