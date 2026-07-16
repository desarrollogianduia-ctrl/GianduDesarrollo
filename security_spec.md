# Security Specification: NutriLab AR

## Data Invariants
1. **Ingredients**: Must have standard nutritional values per 100g. Nutrient values must be non-negative numbers.
2. **Recipes**: Must belong to a valid owner. Ingredients list cannot exceed 100 items. Amounts must be positive.
3. **Identity**: Users can only see and modify their own recipes. Global ingredients are readable by all authenticated users but only modifiable by verified experts (for this demo, verified users).

## The "Dirty Dozen" Payloads (Attack Vectors)
1. **Shadow Field Injection**: Adding `isAdmin: true` to a profile or ingredient.
2. **Identity Spoofing**: Creating a recipe with someone else's `ownerId`.
3. **Large Payload Attack**: Sending a 5MB string for the ingredient name.
4. **Invalid Enum**: Setting ingredient category to "invalid_category".
5. **Negative Nutrition**: Setting sodium to -500mg.
6. **Orphaned Recipe**: Creating a recipe referencing a non-existent ingredient ID (guarded by `exists()`).
7. **Resource Exhaustion**: Creating 10,000 recipes in a minute (Rate limiting is usually handled by Firebase, but rules can block large arrays).
8. **Status Shortcut**: (Not applicable yet, but terminal state locking).
9. **Update Gap**: Modifying the `ownerId` of a recipe during an update.
10. **Unverified Write**: Writing to the database without a verified email.
11. **ID Poisoning**: Using a 10KB string as a document ID.
12. **Public Data Leak**: Attempting to list recipes of other users.

## Red Team Audit Findings (Pre-Patch)
- **Vulnerability**: Ingredients update block allows any verified user to change any ingredient.
- **Vulnerability**: No `exists()` check for ingredients referenced in recipes during creation.
- **Vulnerability**: No size checks on string fields beyond `name`.

## Test Runner (firestore.rules.test.ts snippet)
```typescript
import { 
  assertFails, 
  assertSucceeds, 
  initializeTestEnvironment, 
  RulesTestEnvironment 
} from "@firebase/rules-unit-testing";

// ... Test setup ...

// Test: Identity Spoofing
await assertFails(setDoc(doc(db, 'recipes', 'recipe123'), {
  name: 'Spoofed Recipe',
  ownerId: 'victim_uid',
  ingredients: [],
  servingSize: 100,
  finalYield: 100
}));

// Test: Shadow Field
await assertFails(updateDoc(doc(db, 'ingredients', 'sugar'), {
  isVerified: true
}));
```
