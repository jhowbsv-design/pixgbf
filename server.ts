import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";

// Load Firebase config
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));

// Initialize Firebase Admin
let app;
try {
  app = initializeApp({
    projectId: firebaseConfig.projectId
  });
  console.log("Firebase Admin initialized with project ID:", firebaseConfig.projectId);
} catch (e) {
  console.error("Error initializing Firebase Admin:", e);
  app = initializeApp(); // Fallback to default
}

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
db.settings({ ignoreUndefinedProperties: true });
const auth = getAuth(app);
console.log("Firestore initialized with database ID:", firebaseConfig.firestoreDatabaseId || "(default)");
const JWT_SECRET = process.env.JWT_SECRET || "gbf-smartpix-secret-2026";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/register", async (req, res) => {
    const { nome, usuario, senha, tipo, empresa_id } = req.body;

    if (!nome || !usuario || !senha || !tipo) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes" });
    }

    try {
      const existing = await db.collection("users").where("usuario", "==", usuario).get();
      if (!existing.empty) {
        return res.status(400).json({ error: "Usuário já existe" });
      }

      const senha_hash = await bcrypt.hash(senha, 10);
      const newUser = {
        nome,
        displayName: nome,
        usuario,
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
      res.json({ id: docRef.id, success: true, message: "Cadastro realizado com sucesso! Aguarde a ativação pelo administrador." });

    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { usuario, senha } = req.body;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const dispositivo = req.headers["user-agent"];

    if (!usuario || !senha) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios" });
    }

    try {
      const userSnap = await db.collection("users").where("usuario", "==", usuario).limit(1).get();
      
      if (userSnap.empty) {
        await logLogin(usuario, false, "Usuário não encontrado", ip, dispositivo);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();

      // Check if active
      if (!userData.ativo) {
        await logLogin(usuario, false, "Usuário inativo", ip, dispositivo);
        return res.status(403).json({ error: "Usuário inativo" });
      }

      // Check if blocked
      if (userData.bloqueado_ate) {
        const blockedUntil = new Date(userData.bloqueado_ate);
        if (blockedUntil > new Date()) {
          await logLogin(usuario, false, "Usuário bloqueado temporariamente", ip, dispositivo);
          return res.status(403).json({ error: `Usuário bloqueado até ${blockedUntil.toLocaleString()}` });
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
        await logLogin(usuario, false, "Senha incorreta", ip, dispositivo);
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      // Success
      await userDoc.ref.update({
        tentativas_login: 0,
        bloqueado_ate: null,
        ultimo_login: new Date().toISOString(),
      });

      await logLogin(usuario, true, "Sucesso", ip, dispositivo);

      // Generate Firebase Custom Token
      const customToken = await auth.createCustomToken(userDoc.id, {
        tipo: userData.tipo,
        empresa_id: userData.empresa_id,
        grupo_empresa_id: userData.grupo_empresa_id
      });

      res.json({ 
        token: customToken, 
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
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  // Admin User Management API
  app.post("/api/users", async (req, res) => {
    const { nome, usuario, senha, tipo, empresa_id, grupo_empresa_id } = req.body;
    const authHeader = req.headers.authorization;

    if (!nome || !usuario || !senha || !tipo) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes (nome, usuario, senha, tipo)" });
    }

    if (!authHeader) return res.status(401).json({ error: "Não autorizado" });
    
    try {
      const decoded: any = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      if (decoded.tipo !== "ADM") return res.status(403).json({ error: "Acesso negado" });

      const existing = await db.collection("users").where("usuario", "==", usuario).get();
      if (!existing.empty) return res.status(400).json({ error: "Usuário já existe" });

      const senha_hash = await bcrypt.hash(senha, 10);
      const newUser = {
        nome,
        usuario,
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
      res.status(401).json({ error: "Sessão inválida" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { nome, senha, tipo, empresa_id, grupo_empresa_id, ativo } = req.body;

    if (!id) {
      return res.status(400).json({ error: "ID do usuário é obrigatório" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: "Não autorizado" });

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
      res.status(401).json({ error: "Sessão inválida" });
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
