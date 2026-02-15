import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();

// CORS helper function
const corsHandler = (req: functions.https.Request, res: functions.Response) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
};

// API: Get all confirmations
export const getConfirmacoes = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      try {
        const snapshot = await db.collection("confirmacoes").get();
        const confirmacoes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        response.json(confirmacoes);
      } catch (error) {
        functions.logger.error("Error fetching confirmacoes", error);
        response.status(500).json({error: "Failed to fetch confirmacoes"});
      }
    }
);

// API: Create a new confirmation
export const createConfirmacao = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "POST") {
        response.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        const {nome, email, telefone, quantidadePessoas, mensagem} = request.body;

        if (!nome || !email || !quantidadePessoas) {
          response.status(400).json({
            error: "Campos obrigatórios: nome, email, quantidadePessoas",
          });
          return;
        }

        const confirmacao = {
          nome,
          email,
          telefone: telefone || "",
          quantidadePessoas: parseInt(quantidadePessoas),
          mensagem: mensagem || "",
          dataConfirmacao: admin.firestore.FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection("confirmacoes").add(confirmacao);
        response.status(201).json({id: docRef.id, ...confirmacao});
      } catch (error) {
        functions.logger.error("Error creating confirmacao", error);
        response.status(500).json({error: "Failed to create confirmacao"});
      }
    }
);

// API: Get all gifts (presentes)
export const getPresentes = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      try {
        const snapshot = await db.collection("presentes").get();
        const presentes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        response.json(presentes);
      } catch (error) {
        functions.logger.error("Error fetching presentes", error);
        response.status(500).json({error: "Failed to fetch presentes"});
      }
    }
);

// API: Update a gift (presente)
export const updatePresente = functions.https.onRequest(
    async (request, response) => {
      if (corsHandler(request, response)) return;

      if (request.method !== "PUT") {
        response.status(405).json({error: "Method not allowed"});
        return;
      }

      try {
        // Get ID from query parameter or request body
        const presenteId = request.query.id as string || request.body.id;
        if (!presenteId) {
          response.status(400).json({error: "Presente ID is required"});
          return;
        }

        const presenteRef = db.collection("presentes").doc(presenteId);
        const presenteDoc = await presenteRef.get();

        if (!presenteDoc.exists) {
          response.status(404).json({error: "Presente não encontrado"});
          return;
        }

        const updateData: {comprado?: boolean} = {};
        if (request.body.comprado !== undefined) {
          updateData.comprado = request.body.comprado;
        }

        await presenteRef.update(updateData);
        const updatedDoc = await presenteRef.get();
        response.json({id: updatedDoc.id, ...updatedDoc.data()});
      } catch (error) {
        functions.logger.error("Error updating presente", error);
        response.status(500).json({error: "Failed to update presente"});
      }
    }
);

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

// Health check endpoint
export const health = functions.https.onRequest((request, response) => {
  if (corsHandler(request, response)) return;
  response.json({status: "OK", message: "Firebase Functions funcionando"});
});
