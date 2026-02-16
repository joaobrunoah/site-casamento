import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configure Firestore to use emulator if running locally
if (process.env.FUNCTIONS_EMULATOR === "true" || process.env.FIRESTORE_EMULATOR_HOST) {
  // The emulator host is automatically set by Firebase emulators
  // But we can also explicitly set it if needed
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
  functions.logger.info(`Using Firestore emulator at ${emulatorHost}`);
}

// CORS helper function
const corsHandler = (req: functions.https.Request, res: functions.Response) => {
  // Set CORS headers for all requests
  // Allow all origins for local development (can be restricted in production)
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
};

// API: Login
export const login = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "POST") {
        response.status(405).json({error: "Método não permitido"});
        return;
      }

      try {
        const {user, password} = request.body;

        if (!user || !password) {
          response.status(400).json({
            error: "Usuário e senha são obrigatórios",
          });
          return;
        }

        // Read credentials from environment variables
        const validUser = process.env.ADMIN_USER;
        const validPassword = process.env.ADMIN_PASSWORD;

        if (!validUser || !validPassword) {
          functions.logger.error("Admin credentials not configured in environment");
          response.status(500).json({error: "Configuração do servidor inválida"});
          return;
        }

        if (user === validUser && password === validPassword) {
          response.json({success: true, message: "Login realizado com sucesso"});
        } else {
          response.status(401).json({success: false, error: "Usuário ou senha incorretos"});
        }
      } catch (error) {
        functions.logger.error("Error in login", error);
        response.status(500).json({error: "Erro ao processar login"});
      }
    }
);

// API: Get config
export const getConfig = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      try {
        const configDoc = await db.collection("config").doc("config").get();
        
        if (!configDoc.exists) {
          // Create default config if it doesn't exist
          const defaultConfig = {
            "show-confirmation-form": false,
            "show-gifts-list": false,
          };
          await db.collection("config").doc("config").set(defaultConfig);
          response.json({success: true, config: defaultConfig});
          return;
        }

        response.json({success: true, config: configDoc.data()});
      } catch (error) {
        functions.logger.error("Error fetching config", error);
        response.status(500).json({error: "Erro ao buscar configuração"});
      }
    }
);

// API: Update config
export const updateConfig = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "POST") {
        response.status(405).json({error: "Método não permitido"});
        return;
      }

      try {
        const updateData = request.body;
        
        if (!updateData || typeof updateData !== "object") {
          response.status(400).json({error: "Dados inválidos"});
          return;
        }

        await db.collection("config").doc("config").set(updateData, { merge: true });
        const updatedDoc = await db.collection("config").doc("config").get();
        
        response.json({success: true, config: updatedDoc.data()});
      } catch (error) {
        functions.logger.error("Error updating config", error);
        response.status(500).json({error: "Erro ao atualizar configuração"});
      }
    }
);

// Helper function to fetch guests for an invite
async function fetchGuestsForInvite(inviteId: string): Promise<any[]> {
  const guestsSnapshot = await db.collection("guests")
    .where("inviteId", "==", inviteId)
    .get();
  
  return guestsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// API: Get all invites
export const listInvites = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      try {
        const snapshot = await db.collection("invites").get();
        const invites = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const inviteData = doc.data();
            const guests = await fetchGuestsForInvite(doc.id);
            return {
              id: doc.id,
              ...inviteData,
              guests: guests.map(({ inviteId, ...guestData }) => guestData), // Keep guest id, remove inviteId
            };
          })
        );
        response.json(invites);
      } catch (error) {
        functions.logger.error("Error fetching invites", error);
        response.status(500).json({error: "Failed to fetch invites"});
      }
    }
);

// API: Get a single invite by ID
export const getInvite = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      try {
        const inviteId = request.query.id as string;
        if (!inviteId) {
          response.status(400).json({error: "Invite ID is required"});
          return;
        }

        const inviteDoc = await db.collection("invites").doc(inviteId).get();
        
        if (!inviteDoc.exists) {
          response.status(404).json({error: "Invite not found"});
          return;
        }

        const inviteData = inviteDoc.data();
        const guests = await fetchGuestsForInvite(inviteId);
        
        response.json({
          id: inviteDoc.id,
          ...inviteData,
          guests: guests.map(({ inviteId, ...guestData }) => guestData), // Keep guest id, remove inviteId
        });
      } catch (error) {
        functions.logger.error("Error fetching invite", error);
        response.status(500).json({error: "Failed to fetch invite"});
      }
    }
);

// API: Create or update an invite
export const postInvite = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "POST") {
        response.status(405).json({error: "Method not allowed"});
        return;
      }

      functions.logger.info("postInvite called", { 
        method: request.method,
        body: JSON.stringify(request.body).substring(0, 200) // Log first 200 chars
      });

      try {
        const {
          id,
          nomeDoConvite,
          ddi,
          telefone,
          grupo,
          observacao,
          guests
        } = request.body;

        functions.logger.info("Parsed invite data", {
          id: id || "new",
          nomeDoConvite: nomeDoConvite || "(empty)",
          guestsCount: guests?.length || 0
        });

        // Validate required fields - allow empty string but not undefined/null
        if (nomeDoConvite === undefined || nomeDoConvite === null) {
          functions.logger.warn("Validation failed: nomeDoConvite is missing");
          response.status(400).json({
            error: "Campo obrigatório: nomeDoConvite",
          });
          return;
        }

        const inviteData = {
          nomeDoConvite: nomeDoConvite || "",
          ddi: ddi || "",
          telefone: telefone || "",
          grupo: grupo || "",
          observacao: observacao || "",
          updatedAt: FieldValue.serverTimestamp(),
        };

        let inviteId: string;
        let inviteRef: admin.firestore.DocumentReference;

        try {
          functions.logger.info("Attempting to save to Firestore", {
            collection: "invites",
            hasId: !!id,
            emulator: process.env.FIRESTORE_EMULATOR_HOST || "production"
          });

          if (id) {
            // Update existing invite
            functions.logger.info(`Updating existing invite: ${id}`);
            inviteRef = db.collection("invites").doc(id);
            await inviteRef.set(inviteData, { merge: true });
            inviteId = id;
            functions.logger.info(`Successfully updated invite: ${id}`);
            
            // Delete existing guests for this invite
            const existingGuests = await db.collection("guests")
              .where("inviteId", "==", inviteId)
              .get();
            
            const deletePromises = existingGuests.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);
            functions.logger.info(`Deleted ${existingGuests.size} existing guests for invite ${inviteId}`);
          } else {
            // Create new invite
            functions.logger.info("Creating new invite");
            inviteRef = await db.collection("invites").add({
              ...inviteData,
              createdAt: FieldValue.serverTimestamp(),
            });
            inviteId = inviteRef.id;
            functions.logger.info(`Successfully created invite with ID: ${inviteId}`);
          }

          // Save guests to separate collection
          if (guests && Array.isArray(guests)) {
            const guestPromises = guests.map(async (guest: any) => {
              const { id: guestId, ...guestData } = guest;
              const guestRef = db.collection("guests").doc();
              await guestRef.set({
                inviteId: inviteId,
                ...guestData,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              });
              return guestRef.id;
            });
            await Promise.all(guestPromises);
            functions.logger.info(`Saved ${guests.length} guests for invite ${inviteId}`);
          }

          const savedDoc = await inviteRef.get();
          
          if (!savedDoc.exists) {
            functions.logger.error("Document does not exist after save operation", { inviteId });
            throw new Error("Document was not created successfully");
          }

          // Fetch guests to include in response
          const savedGuests = await fetchGuestsForInvite(inviteId);
          
          functions.logger.info("Invite saved successfully", { inviteId });
          response.status(200).json({
            id: inviteId,
            ...savedDoc.data(),
            guests: savedGuests.map(({ inviteId, ...guestData }) => guestData), // Keep guest id, remove inviteId
          });
        } catch (dbError) {
          const errorDetails = {
            message: dbError instanceof Error ? dbError.message : String(dbError),
            stack: dbError instanceof Error ? dbError.stack : undefined,
            code: (dbError as any)?.code,
            emulator: process.env.FIRESTORE_EMULATOR_HOST || "not set"
          };
          functions.logger.error("Database error saving invite", errorDetails);
          console.error("❌ Database Error:", errorDetails);
          throw new Error(`Database error: ${errorDetails.message}`);
        }
      } catch (error) {
        const errorDetails = {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          type: error?.constructor?.name
        };
        functions.logger.error("Error saving invite - Full Error", errorDetails);
        console.error("❌ Error saving invite:", errorDetails);
        response.status(500).json({
          error: "Failed to save invite",
          details: errorDetails.message
        });
      }
    }
);

// API: Update invite partially (PUT method)
export const updateInvite = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "PUT") {
        response.status(405).json({error: "Method not allowed. Use PUT."});
        return;
      }

      try {
        const inviteId = request.query.id as string || request.body.id;
        
        if (!inviteId) {
          response.status(400).json({error: "Invite ID is required"});
          return;
        }

        const updateData = request.body;
        
        if (!updateData || typeof updateData !== "object") {
          response.status(400).json({error: "Invalid update data"});
          return;
        }

        functions.logger.info("Updating invite", { inviteId, updateData });

        const inviteRef = db.collection("invites").doc(inviteId);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
          response.status(404).json({error: "Invite not found"});
          return;
        }

        // Handle guest updates
        if (updateData.guests && Array.isArray(updateData.guests)) {
          // Check if this is a full array replacement (guests have nome, genero, etc.)
          // vs partial updates (guests have index, situacao, mesa)
          const isFullReplacement = updateData.guests.length > 0 && 
            (updateData.guests[0].nome !== undefined || 
             updateData.guests[0].genero !== undefined ||
             updateData.guests[0].faixaEtaria !== undefined);
          
          if (isFullReplacement) {
            // Full array replacement - delete existing guests and create new ones
            const existingGuests = await db.collection("guests")
              .where("inviteId", "==", inviteId)
              .get();
            
            const deletePromises = existingGuests.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);
            
            // Create new guests
            const guestPromises = updateData.guests.map(async (guest: any) => {
              const { id: guestId, ...guestData } = guest;
              const guestRef = db.collection("guests").doc();
              await guestRef.set({
                inviteId: inviteId,
                ...guestData,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              });
              return guestRef.id;
            });
            await Promise.all(guestPromises);
          } else {
            // Partial updates - update specific guest fields by index
            const currentGuests = await fetchGuestsForInvite(inviteId);
            
            updateData.guests.forEach((guestUpdate: any) => {
              if (guestUpdate.index !== undefined && guestUpdate.index >= 0 && guestUpdate.index < currentGuests.length) {
                const guestId = currentGuests[guestUpdate.index].id;
                const guestRef = db.collection("guests").doc(guestId);
                const updateFields: any = {
                  updatedAt: FieldValue.serverTimestamp(),
                };
                
                if (guestUpdate.situacao !== undefined) {
                  updateFields.situacao = guestUpdate.situacao;
                }
                if (guestUpdate.mesa !== undefined) {
                  updateFields.mesa = guestUpdate.mesa;
                }
                
                guestRef.update(updateFields);
              }
            });
          }
        }

        // Prepare update object (exclude id and guests from updateData)
        const { id, guests, ...fieldsToUpdate } = updateData;
        
        // Add updatedAt timestamp
        const finalUpdateData = {
          ...fieldsToUpdate,
          updatedAt: FieldValue.serverTimestamp(),
        };

        await inviteRef.update(finalUpdateData);
        
        const updatedDoc = await inviteRef.get();
        const updatedGuests = await fetchGuestsForInvite(inviteId);
        
        functions.logger.info("Invite updated successfully", { inviteId });
        response.status(200).json({
          id: inviteId,
          ...updatedDoc.data(),
          guests: updatedGuests.map(({ inviteId, ...guestData }) => guestData), // Keep guest id, remove inviteId
        });
      } catch (error) {
        functions.logger.error("Error updating invite", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        response.status(500).json({
          error: "Failed to update invite",
          details: errorMessage
        });
      }
    }
);

// API: Delete an invite
export const deleteInvite = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "DELETE" && request.method !== "POST") {
        response.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        const inviteId = request.query.id as string || request.body.id;
        
        if (!inviteId) {
          response.status(400).json({error: "Invite ID is required"});
          return;
        }

        functions.logger.info("Deleting invite", { inviteId });

        const inviteRef = db.collection("invites").doc(inviteId);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
          response.status(404).json({error: "Invite not found"});
          return;
        }

        // Delete all guests associated with this invite
        const guestsSnapshot = await db.collection("guests")
          .where("inviteId", "==", inviteId)
          .get();
        
        const deleteGuestPromises = guestsSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deleteGuestPromises);
        functions.logger.info(`Deleted ${guestsSnapshot.size} guests for invite ${inviteId}`);

        // Delete the invite
        await inviteRef.delete();
        
        functions.logger.info("Invite deleted successfully", { inviteId });
        response.status(200).json({success: true, message: "Invite deleted successfully", id: inviteId});
      } catch (error) {
        functions.logger.error("Error deleting invite", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        response.status(500).json({
          error: "Failed to delete invite",
          details: errorMessage
        });
      }
    }
);

// API: Get a single guest by ID
export const getGuest = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      try {
        const guestId = request.query.id as string;
        if (!guestId) {
          response.status(400).json({error: "Guest ID is required"});
          return;
        }

        const guestDoc = await db.collection("guests").doc(guestId).get();
        
        if (!guestDoc.exists) {
          response.status(404).json({error: "Guest not found"});
          return;
        }

        const guestData = guestDoc.data();
        const { inviteId, ...guestWithoutInviteId } = guestData!;
        
        response.json({
          id: guestDoc.id,
          ...guestWithoutInviteId,
        });
      } catch (error) {
        functions.logger.error("Error fetching guest", error);
        response.status(500).json({error: "Failed to fetch guest"});
      }
    }
);

// API: Create or update a guest
export const postGuest = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "POST") {
        response.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        const {
          id,
          inviteId,
          nome,
          genero,
          faixaEtaria,
          custo,
          situacao,
          mesa
        } = request.body;

        if (!inviteId) {
          response.status(400).json({error: "inviteId is required"});
          return;
        }

        // Verify invite exists
        const inviteDoc = await db.collection("invites").doc(inviteId).get();
        if (!inviteDoc.exists) {
          response.status(404).json({error: "Invite not found"});
          return;
        }

        const guestData = {
          inviteId: inviteId,
          nome: nome || "",
          genero: genero || "",
          faixaEtaria: faixaEtaria || "",
          custo: custo || "",
          situacao: situacao || "",
          mesa: mesa || "",
          updatedAt: FieldValue.serverTimestamp(),
        };

        let guestId: string;
        let guestRef: admin.firestore.DocumentReference;

        if (id) {
          // Update existing guest
          guestRef = db.collection("guests").doc(id);
          await guestRef.set(guestData, { merge: true });
          guestId = id;
        } else {
          // Create new guest
          guestRef = await db.collection("guests").add({
            ...guestData,
            createdAt: FieldValue.serverTimestamp(),
          });
          guestId = guestRef.id;
        }

        const savedDoc = await guestRef.get();
        const savedData = savedDoc.data()!;
        const { inviteId: savedInviteId, ...guestWithoutInviteId } = savedData;
        
        response.status(200).json({
          id: guestId,
          ...guestWithoutInviteId,
        });
      } catch (error) {
        functions.logger.error("Error saving guest", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        response.status(500).json({
          error: "Failed to save guest",
          details: errorMessage
        });
      }
    }
);

// API: Update guest partially (PUT method)
export const updateGuest = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "PUT") {
        response.status(405).json({error: "Method not allowed. Use PUT."});
        return;
      }

      try {
        const guestId = request.query.id as string || request.body.id;
        
        if (!guestId) {
          response.status(400).json({error: "Guest ID is required"});
          return;
        }

        const updateData = request.body;
        
        if (!updateData || typeof updateData !== "object") {
          response.status(400).json({error: "Invalid update data"});
          return;
        }

        const guestRef = db.collection("guests").doc(guestId);
        const guestDoc = await guestRef.get();

        if (!guestDoc.exists) {
          response.status(404).json({error: "Guest not found"});
          return;
        }

        // Prepare update object (exclude id and inviteId from updateData)
        const { id, inviteId, ...fieldsToUpdate } = updateData;
        
        // Add updatedAt timestamp
        const finalUpdateData = {
          ...fieldsToUpdate,
          updatedAt: FieldValue.serverTimestamp(),
        };

        await guestRef.update(finalUpdateData);
        
        const updatedDoc = await guestRef.get();
        const updatedData = updatedDoc.data()!;
        const { inviteId: updatedInviteId, ...guestWithoutInviteId } = updatedData;
        
        response.status(200).json({
          id: guestId,
          ...guestWithoutInviteId,
        });
      } catch (error) {
        functions.logger.error("Error updating guest", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        response.status(500).json({
          error: "Failed to update guest",
          details: errorMessage
        });
      }
    }
);

// API: Delete a guest
export const deleteGuest = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "DELETE" && request.method !== "POST") {
        response.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        const guestId = request.query.id as string || request.body.id;
        
        if (!guestId) {
          response.status(400).json({error: "Guest ID is required"});
          return;
        }

        const guestRef = db.collection("guests").doc(guestId);
        const guestDoc = await guestRef.get();

        if (!guestDoc.exists) {
          response.status(404).json({error: "Guest not found"});
          return;
        }

        await guestRef.delete();
        
        functions.logger.info("Guest deleted successfully", { guestId });
        response.status(200).json({success: true, message: "Guest deleted successfully", id: guestId});
      } catch (error) {
        functions.logger.error("Error deleting guest", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        response.status(500).json({
          error: "Failed to delete guest",
          details: errorMessage
        });
      }
    }
);

// Health check endpoint
export const health = functions.https.onRequest((request, response) => {
  if (corsHandler(request, response)) return;
  response.json({status: "OK", message: "Firebase Functions funcionando"});
});

// Test Firestore connectivity
export const testFirestore = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      try {
        // Try to write to a test collection
        const testRef = db.collection("_test").doc("connection");
        await testRef.set({ timestamp: FieldValue.serverTimestamp() });
        await testRef.get();
        
        // Try to access invites collection
        const invitesRef = db.collection("invites");
        const snapshot = await invitesRef.limit(1).get();
        
        response.json({
          status: "OK",
          message: "Firestore is accessible",
          emulator: process.env.FIRESTORE_EMULATOR_HOST || "Not using emulator",
          invitesCount: snapshot.size
        });
      } catch (error) {
        functions.logger.error("Firestore test failed", error);
        response.status(500).json({
          status: "ERROR",
          error: error instanceof Error ? error.message : String(error),
          emulator: process.env.FIRESTORE_EMULATOR_HOST || "Not set"
        });
      }
    }
);
