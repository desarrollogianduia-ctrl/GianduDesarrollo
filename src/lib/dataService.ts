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
import { Ingredient, Recipe, DevelopmentProject, KnowledgeDocument, RecipeAudit, WasteEntry, CalendarEvent } from "../types";

export const subscribeRecipeAudits = (callback: (audits: RecipeAudit[]) => void, onError?: (error: Error) => void) => {
  return onSnapshot(collection(db, "recipeAudits"), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecipeAudit));
    callback(data);
  }, (error) => {
    try {
      handleFirestoreError(error, 'list', 'recipeAudits');
    } catch (e: any) {
      if (onError) onError(e);
      else console.warn("recipeAudits subscription handled error:", e?.message);
    }
  });
};

export const saveRecipeAudit = async (audit: RecipeAudit) => {
  const path = `recipeAudits/${audit.id}`;
  try {
    const auditRef = doc(db, "recipeAudits", audit.id);
    const data = cleanData(audit);
    await setDoc(auditRef, data);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const subscribeKnowledgeDocuments = (userId: string, callback: (docs: KnowledgeDocument[]) => void, onError?: (error: Error) => void) => {
  // Shared access: removing ownerId filter
  const q = query(collection(db, "knowledge"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KnowledgeDocument));
    callback(data);
  }, (error) => {
    try {
      handleFirestoreError(error, 'list', 'knowledge');
    } catch (e: any) {
      if (onError) onError(e);
      else console.warn("knowledge subscription handled error:", e?.message);
    }
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

export const subscribeIngredients = (callback: (ingredients: Ingredient[]) => void, onError?: (error: Error) => void) => {
  return onSnapshot(collection(db, "ingredients"), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));
    callback(data);
  }, (error) => {
    try {
      handleFirestoreError(error, 'list', 'ingredients');
    } catch (e: any) {
      if (onError) onError(e);
      else console.warn("ingredients subscription handled error:", e?.message);
    }
  });
};

export const subscribeRecipes = (userId: string, callback: (recipes: Recipe[]) => void, onError?: (error: Error) => void) => {
  // Shared access: removing ownerId filter
  const q = query(collection(db, "recipes"));
  return onSnapshot(q, (snapshot) => {
    const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
    callback(recipes);
  }, (error) => {
    try {
      handleFirestoreError(error, 'list', 'recipes');
    } catch (e: any) {
      if (onError) onError(e);
      else console.warn("recipes subscription handled error:", e?.message);
    }
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

export const subscribeDevelopments = (userId: string, callback: (developments: DevelopmentProject[]) => void, onError?: (error: Error) => void) => {
  // Shared access: removing createdBy filter
  const q = query(collection(db, "developments"));
  return onSnapshot(q, (snapshot) => {
    const developments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DevelopmentProject));
    callback(developments);
  }, (error) => {
    try {
      handleFirestoreError(error, 'list', 'developments');
    } catch (e: any) {
      if (onError) onError(e);
      else console.warn("developments subscription handled error:", e?.message);
    }
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

export const subscribeWastes = (callback: (wastes: WasteEntry[]) => void, onError?: (error: Error) => void) => {
  return onSnapshot(collection(db, "wastes"), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WasteEntry));
    callback(data);
  }, (error) => {
    try {
      handleFirestoreError(error, 'list', 'wastes');
    } catch (e: any) {
      if (onError) onError(e);
      else console.warn("wastes subscription handled error:", e?.message);
    }
  });
};

export const saveWasteEntry = async (waste: WasteEntry) => {
  const path = `wastes/${waste.id}`;
  try {
    const wasteRef = doc(db, "wastes", waste.id);
    const data = cleanData(waste);
    await setDoc(wasteRef, data);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const deleteWasteEntry = async (id: string) => {
  const path = `wastes/${id}`;
  try {
    const wasteRef = doc(db, "wastes", id);
    await deleteDoc(wasteRef);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'delete', path);
    throw error;
  }
};

export const subscribeCalendarEvents = (callback: (events: CalendarEvent[]) => void, onError?: (error: Error) => void) => {
  return onSnapshot(collection(db, "events"), (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent));
    callback(data);
  }, (error) => {
    try {
      handleFirestoreError(error, 'list', 'events');
    } catch (e: any) {
      if (onError) onError(e);
      else console.warn("events subscription handled error:", e?.message);
    }
  });
};

export const saveCalendarEvent = async (event: CalendarEvent) => {
  const path = `events/${event.id}`;
  try {
    const eventRef = doc(db, "events", event.id);
    const data = cleanData(event);
    await setDoc(eventRef, data);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'write', path);
    throw error;
  }
};

export const deleteCalendarEvent = async (id: string) => {
  const path = `events/${id}`;
  try {
    const eventRef = doc(db, "events", id);
    await deleteDoc(eventRef);
  } catch (error) {
    if (error instanceof FirestoreError) handleFirestoreError(error, 'delete', path);
    throw error;
  }
};

export const batchImportData = async (
  data: {
    ingredients?: Ingredient[];
    recipes?: Recipe[];
    developments?: DevelopmentProject[];
  },
  userId: string
) => {
  const operations: Array<{ ref: any; data: any }> = [];

  if (data.ingredients && data.ingredients.length > 0) {
    data.ingredients.forEach((ing) => {
      operations.push({
        ref: doc(db, "ingredients", ing.id),
        data: cleanData(ing),
      });
    });
  }

  if (data.recipes && data.recipes.length > 0) {
    data.recipes.forEach((rec) => {
      operations.push({
        ref: doc(db, "recipes", rec.id),
        data: cleanData({ ...rec, ownerId: userId }),
      });
    });
  }

  if (data.developments && data.developments.length > 0) {
    data.developments.forEach((dev) => {
      operations.push({
        ref: doc(db, "developments", dev.id),
        data: cleanData({ ...dev, createdBy: userId }),
      });
    });
  }

  // Firestore allows up to 500 writes per batch. We chunk by 400.
  const CHUNK_SIZE = 400;
  for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((op) => {
      batch.set(op.ref, op.data);
    });
    try {
      await batch.commit();
    } catch (error) {
      if (error instanceof FirestoreError) {
        handleFirestoreError(error, "write", "batch_import");
      }
      throw error;
    }
  }

  return {
    ingredientsCount: data.ingredients?.length || 0,
    recipesCount: data.recipes?.length || 0,
    developmentsCount: data.developments?.length || 0,
  };
};

