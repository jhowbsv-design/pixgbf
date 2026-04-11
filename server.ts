import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const defaultServiceAccountPath = path.resolve(process.cwd(), "secrets", "service-account.json");
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || (fs.existsSync(defaultServiceAccountPath) ? defaultServiceAccountPath : "");
const readJson = (filePath: string) => JSON.parse(fs.readFileSync(filePath, "utf-8"));

// Initialize Firebase Admin
let app;
try {
  if (serviceAccountPath) {
    const absServicePath = path.isAbsolute(serviceAccountPath)
      ? serviceAccountPath
      : path.resolve(process.cwd(), serviceAccountPath);
    const serviceAccount = readJson(absServicePath);

    app = initializeApp({
      projectId: firebaseConfig.projectId,
      credential: cert(serviceAccount),
    });
    console.log("Firebase Admin initialized with Service Account:", absServicePath);
  } else {
    app = initializeApp({
      projectId: firebaseConfig.projectId,
      credential: applicationDefault(),
    });
    console.log("Firebase Admin initialized with Application Default Credentials.");
  }
} catch (e) {
  console.error("Error initializing Firebase Admin:", e);
  app = initializeApp({
    projectId: firebaseConfig.projectId
  });
}

const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
const db = databaseId === "(default)"
  ? getFirestore(app)
  : getFirestore(app, databaseId);
db.settings({ ignoreUndefinedProperties: true });
const adminAuth = getAuth(app);
console.log("Firestore initialized with database ID:", databaseId);
const JWT_SECRET = process.env.JWT_SECRET || "gbf-smartpix-secret-2026";

function normalizeUsuario(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getFriendlyServerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes("Could not load the default credentials") ||
    message.includes("credential implementation provided to initializeApp() via the \"credential\" property failed to fetch")
  ) {
    return "Firebase Admin sem credenciais locais. Configure FIREBASE_SERVICE_ACCOUNT_PATH ou rode gcloud auth application-default login.";
  }

  return message;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/public/empresas", async (_req, res) => {
    try {
      const snap = await db.collection("empresas").where("active", "==", true).get();
      const empresas = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
      res.json(empresas);
    } catch (error) {
      console.error("Public empresas error:", error);
      res.status(500).json({ error: getFriendlyServerError(error) });
    }
  });

  app.post("/api/register", async (req, res) => {
    const { nome, usuario, senha, tipo, empresa_id } = req.body;
    const usuarioNormalizado = normalizeUsuario(usuario);

    if (!nome || !usuarioNormalizado || !senha || !tipo) {
      return res.status(400).json({ error: "Campos obrigatÃ³rios ausentes" });
    }

    try {
      const existing = await db.collection("users").where("usuario_normalized", "==", usuarioNormalizado).limit(1).get();
      if (!existing.empty) {
        return res.status(400).json({ error: "UsuÃ¡rio jÃ¡ existe" });
      }

      const existingLegacy = await db.collection("users").where("usuario", "==", usuario).limit(1).get();
      if (!existingLegacy.empty) {
        return res.status(400).json({ error: "UsuÃ¡rio jÃ¡ existe" });
      }

      const senha_hash = await bcrypt.hash(senha, 10);
      const newUser = {
        nome,
        displayName: nome,
        usuario,
        usuario_normalized: usuarioNormalizado,
        senha_hash,
        role: tipo,
        tipo,
        empresa_id: empresa_id || null,
        ativo: false, // New registrations are inactive by default for admin approval
        active: false,
        tentativas_login: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await db.collection("users").add(newUser);
      res.json({ id: docRef.id, success: true, message: "Cadastro realizado com sucesso! Aguarde a ativaÃ§Ã£o pelo administrador." });

    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: getFriendlyServerError(error) });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { usuario, senha } = req.body;
    const usuarioNormalizado = normalizeUsuario(usuario);
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const dispositivo = req.headers["user-agent"];

    if (!usuarioNormalizado || !senha) {
      return res.status(400).json({ error: "UsuÃ¡rio e senha sÃ£o obrigatÃ³rios" });
    }

    try {
      let userSnap = await db.collection("users").where("usuario_normalized", "==", usuarioNormalizado).limit(1).get();
      if (userSnap.empty) {
        userSnap = await db.collection("users").where("usuario", "==", usuario).limit(1).get();
      }
      if (userSnap.empty) {
        const allUsersSnap = await db.collection("users").limit(200).get();
        const matchedDoc = allUsersSnap.docs.find((item) => {
          const data = item.data();
          return normalizeUsuario(data.usuario) === usuarioNormalizado;
        });

        if (matchedDoc) {
          userSnap = {
            empty: false,
            docs: [matchedDoc],
          } as typeof userSnap;
        }
      }
      
      if (userSnap.empty) {
        await logLogin(usuarioNormalizado, false, "UsuÃ¡rio nÃ£o encontrado", ip, dispositivo);
        return res.status(401).json({ error: "Credenciais invÃ¡lidas" });
      }

      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();

      if (!userData.usuario_normalized && userData.usuario) {
        await userDoc.ref.update({ usuario_normalized: normalizeUsuario(userData.usuario) });
      }

      // Check if active
      if (userData.ativo === false || userData.active === false) {
        await logLogin(usuarioNormalizado, false, "Usuário aguardando aprovação", ip, dispositivo);
        return res.status(403).json({ error: "Seu cadastro está aguardando aprovação do administrador." });
      }

      // Check if blocked
      if (userData.bloqueado_ate) {
        const blockedUntil = new Date(userData.bloqueado_ate);
        if (blockedUntil > new Date()) {
          await logLogin(usuarioNormalizado, false, "UsuÃ¡rio bloqueado temporariamente", ip, dispositivo);
          return res.status(403).json({ error: `UsuÃ¡rio bloqueado atÃ© ${blockedUntil.toLocaleString()}` });
        }
      }

      // Check password
      const isMatch = await bcrypt.compare(senha, userData.senha_hash);
      if (!isMatch) {
        const newAttempts = (userData.tentativas_login || 0) + 1;
        const updates: any = { tentativas_login: newAttempts };
        
        if (newAttempts >= 5) {
          const blockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          updates.bloqueado_ate = blockUntil.toISOString();
          updates.tentativas_login = 0; // Reset after blocking
        }

        await userDoc.ref.update(updates);
        await logLogin(usuarioNormalizado, false, "Senha incorreta", ip, dispositivo);
        return res.status(401).json({ error: "Credenciais invÃ¡lidas" });
      }

      // Success
      await userDoc.ref.update({
        tentativas_login: 0,
        bloqueado_ate: null,
        ultimo_login: new Date().toISOString(),
      });

      await logLogin(usuarioNormalizado, true, "Sucesso", ip, dispositivo);

      // Gera um token customizado do Firebase para autenticar o cliente web.
      const token = await adminAuth.createCustomToken(userDoc.id, {
        tipo: userData.tipo,
        role: userData.role,
        empresa_id: userData.empresa_id || null,
        grupo_empresa_id: userData.grupo_empresa_id || null
      });

      const sessionToken = jwt.sign(
        {
          id: userDoc.id,
          tipo: userData.tipo,
          empresa_id: userData.empresa_id,
          grupo_empresa_id: userData.grupo_empresa_id
        },
        JWT_SECRET,
          { expiresIn: "1d" }
      );

      res.json({ 
        token, 
        sessionToken, 
        user: {
          id: userDoc.id,
          nome: userData.nome,
          usuario: userData.usuario,
          tipo: userData.tipo,
          empresa_id: userData.empresa_id,
          grupo_empresa_id: userData.grupo_empresa_id
        }
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: getFriendlyServerError(error) });
    }
  });

  // Admin User Management API
  app.post("/api/users", async (req, res) => {
    const { nome, usuario, senha, tipo, empresa_id, grupo_empresa_id } = req.body;
    const usuarioNormalizado = normalizeUsuario(usuario);
    const authHeader = req.headers.authorization;

    if (!nome || !usuarioNormalizado || !senha || !tipo) {
      return res.status(400).json({ error: "Campos obrigatÃ³rios ausentes (nome, usuario, senha, tipo)" });
    }

    if (!authHeader) return res.status(401).json({ error: "NÃ£o autorizado" });
    
    try {
      const decoded: any = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      if (decoded.tipo !== "ADM") return res.status(403).json({ error: "Acesso negado" });

      const existing = await db.collection("users").where("usuario_normalized", "==", usuarioNormalizado).limit(1).get();
      if (!existing.empty) return res.status(400).json({ error: "UsuÃ¡rio jÃ¡ existe" });

      const senha_hash = await bcrypt.hash(senha, 10);
      const newUser = {
        nome,
        usuario,
        usuario_normalized: usuarioNormalizado,
        senha_hash,
        tipo,
        empresa_id,
        grupo_empresa_id,
        ativo: true,
        tentativas_login: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const docRef = await db.collection("users").add(newUser);
      res.json({ id: docRef.id, ...newUser, senha_hash: undefined });

    } catch (error) {
      res.status(401).json({ error: "SessÃ£o invÃ¡lida" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, senha, tipo, empresa_id, grupo_empresa_id, ativo } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID do usuÃ¡rio Ã© obrigatÃ³rio" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: "NÃ£o autorizado" });

    try {
      const decoded: any = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      if (decoded.tipo !== "ADM") return res.status(403).json({ error: "Acesso negado" });

      const updates: any = {
        updated_at: new Date().toISOString()
      };
      if (nome) updates.nome = nome;
      if (tipo) updates.tipo = tipo;
      if (empresa_id) updates.empresa_id = empresa_id;
      if (grupo_empresa_id) updates.grupo_empresa_id = grupo_empresa_id;
      if (ativo !== undefined) updates.ativo = ativo;
      if (senha) updates.senha_hash = await bcrypt.hash(senha, 10);

      await db.collection("users").doc(id).update(updates);
      res.json({ success: true });

    } catch (error) {
      res.status(401).json({ error: "SessÃ£o invÃ¡lida" });
    }
  });

  async function logLogin(usuario: string, sucesso: boolean, detalhes: string, ip: any, dispositivo: any) {
    await db.collection("login_logs").add({
      usuario,
      data_hora: new Date().toISOString(),
      sucesso,
      detalhes,
      ip: String(ip),
      dispositivo: String(dispositivo)
    });
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

