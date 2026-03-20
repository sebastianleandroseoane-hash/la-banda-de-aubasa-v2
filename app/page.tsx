"use client";

import { useEffect, useMemo, useState } from "react";
import { createMatch, getMatches, updateMatch } from "./lib/api/matches";
import { deleteMatchPhoto, uploadMatchPhotos } from "./lib/api/photos";
import { replaceScorers } from "./lib/api/scorers";
import type { MatchForm, MatchRow } from "./types/index";
import { supabase } from "./supabase/supabase";

const plantel = [
  "Gonzalo Salgado",
  "Pablo Cari",
  "Federico Rodríguez",
  "Alexis Cariaga",
  "Nicolás Cari",
  "Ezequiel Lugo",
  "Elías Leguizamón",
  "Lucas González",
  "Ángel Pérez",
  "Maximiliano Álvarez",
  "Pablo Osisnalde",
  "Nicolás Colosimo",
  "Gaspar Vázquez",
  "Germán Granados",
  "Ever Molina Ríos",
  "Ramón Bravo",
  "Cristian Rolón Oviedo",
  "Leonel Rodríguez",
  "Javier Cansino",
  "Agustín Carrizo",
];

const cuerpoTecnico = ["David Olmedo", "David Vargas"];

function Lightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    setIndex(startIndex);
  }, [startIndex]);

  if (!images.length) return null;

  const prev = () => setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          background: "#facc15",
          color: "#111827",
          border: "none",
          padding: "10px 14px",
          cursor: "pointer",
          borderRadius: "10px",
          fontWeight: 800,
        }}
      >
        Cerrar
      </button>

      <button
        onClick={prev}
        style={{
          position: "absolute",
          left: 20,
          background: "#ffffff",
          border: "none",
          padding: "10px 14px",
          cursor: "pointer",
          borderRadius: "10px",
          fontSize: "22px",
          fontWeight: 700,
        }}
      >
        ‹
      </button>

      <img
        src={images[index]}
        alt={`foto-${index}`}
        style={{
          maxWidth: "92vw",
          maxHeight: "90vh",
          borderRadius: "16px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        }}
      />

      <button
        onClick={next}
        style={{
          position: "absolute",
          right: 20,
          background: "#ffffff",
          border: "none",
          padding: "10px 14px",
          cursor: "pointer",
          borderRadius: "10px",
          fontSize: "22px",
          fontWeight: 700,
        }}
      >
        ›
      </button>
    </div>
  );
}

function scorersToSelections(match: MatchRow) {
  if (!match.scorers?.length) return [];

  const names: string[] = [];

  for (const scorer of match.scorers) {
    for (let i = 0; i < Number(scorer.goals || 0); i++) {
      names.push(scorer.player_name);
    }
  }

  return names;
}

function selectionsToInput(selections: string[]) {
  return selections.join(", ");
}

function getRankLabel(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `#${index + 1}`;
}

function formatDate(date: string) {
  if (!date) return "-";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;

  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function Home() {
  const [screen, setScreen] = useState<
    | "inicio"
    | "tabla"
    | "fixture"
    | "goleadores"
    | "partidos"
    | "plantel"
    | "videos"
    | "galeria"
  >("inicio");

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [galleryUploadMatchId, setGalleryUploadMatchId] = useState("");
  const [viewer, setViewer] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [goalInputs, setGoalInputs] = useState<Record<string, string>>({});
  const [goalSelections, setGoalSelections] = useState<
    Record<string, string[]>
  >({});
  const [selectedPlayerByMatch, setSelectedPlayerByMatch] = useState<
    Record<string, string>
  >({});

  const [selectedNewMatchPlayer, setSelectedNewMatchPlayer] = useState(
    plantel[0] || ""
  );
  const [newMatchGoalSelections, setNewMatchGoalSelections] = useState<
    string[]
  >([]);

  const [newMatch, setNewMatch] = useState<MatchForm>({
    rival: "",
    fecha: "",
    fecha_partido: "",
    resultado: "Pendiente",
    goles_a_favor: 0,
    goles_en_contra: 0,
    goles: "",
  });

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const ADMIN_EMAIL = "sebastianleandroseoane@gmail.com";
  const liveUrl =
    "https://www.youtube.com/live/o4R5TRGzyrs?si=o7rOg118cb1ESKhk";
  const latestVideoUrl = "https://youtu.be/gT-qINQNk8Q?si=Q7VIOmGEHZjy2k3H";

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const currentEmail = user?.email ?? null;
      setUserEmail(currentEmail);
      setIsAdmin(currentEmail === ADMIN_EMAIL);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentEmail = session?.user?.email ?? null;
      setUserEmail(currentEmail);
      setIsAdmin(currentEmail === ADMIN_EMAIL);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Error al iniciar sesión: " + error.message);
      return;
    }

    setEmail("");
    setPassword("");
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Error al cerrar sesión: " + error.message);
    }
  }

  async function loadMatches() {
    try {
      setLoading(true);
      const data = await getMatches();
      setMatches(data || []);

      const nextGoalInputs: Record<string, string> = {};
      const nextGoalSelections: Record<string, string[]> = {};
      const nextSelectedPlayerByMatch: Record<string, string> = {};

      for (const match of data || []) {
        const selections = scorersToSelections(match);
        nextGoalSelections[match.id] = selections;
        nextGoalInputs[match.id] = selectionsToInput(selections);
        nextSelectedPlayerByMatch[match.id] = plantel[0] || "";
      }

      setGoalSelections(nextGoalSelections);
      setGoalInputs(nextGoalInputs);
      setSelectedPlayerByMatch(nextSelectedPlayerByMatch);
    } catch (error) {
      console.error("LOAD MATCHES ERROR:", error);
      alert("Error cargando partidos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, []);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const da = new Date(
        `${a.fecha || a.fecha_partido || ""}T00:00:00`
      ).getTime();
      const db = new Date(
        `${b.fecha || b.fecha_partido || ""}T00:00:00`
      ).getTime();

      if (Number.isNaN(da) && Number.isNaN(db)) return 0;
      if (Number.isNaN(da)) return 1;
      if (Number.isNaN(db)) return -1;

      return db - da;
    });
  }, [matches]);

  const galleryPhotos = useMemo(() => {
    return sortedMatches.flatMap((match) =>
      (match.match_photos ?? []).map((photo) => ({
        id: photo.id,
        url: photo.public_url || "",
        storagePath: photo.photo_url || photo.storage_path || "",
        rival: match.rival,
        fecha: match.fecha_partido || match.fecha || "",
      }))
    );
  }, [sortedMatches]);

  const stats = useMemo(() => {
    let pj = 0;
    let pg = 0;
    let pe = 0;
    let pp = 0;
    let gf = 0;
    let gc = 0;

    const scorerMap = new Map<string, { nombre: string; goles: number }>();

    for (const match of matches) {
      if (match.resultado !== "Pendiente") {
        pj += 1;
        gf += Number(match.goles_a_favor || 0);
        gc += Number(match.goles_en_contra || 0);

        if (match.resultado === "Ganado") pg += 1;
        if (match.resultado === "Empatado") pe += 1;
        if (match.resultado === "Perdido") pp += 1;
      }

      for (const s of match.scorers ?? []) {
        const key = s.player_name.trim().toLowerCase();
        const current = scorerMap.get(key);

        if (current) {
          current.goles += Number(s.goals || 0);
        } else {
          scorerMap.set(key, {
            nombre: s.player_name.trim(),
            goles: Number(s.goals || 0),
          });
        }
      }
    }

    const pts = pg * 3 + pe;
    const dg = gf - gc;

    const topScorers = [...scorerMap.values()].sort(
      (a, b) => b.goles - a.goles
    );

    return { pj, pg, pe, pp, gf, gc, dg, pts, topScorers };
  }, [matches]);

  const heroImage = useMemo(() => {
    for (const match of sortedMatches) {
      const photo = match.match_photos?.[0];
      if (photo?.public_url) return photo.public_url;
    }
    return "";
  }, [sortedMatches]);

  const featuredMatch = useMemo(() => {
    if (!sortedMatches.length) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseMatchDate = (match: MatchRow) => {
      const rawDate = match.fecha_partido || match.fecha;
      if (!rawDate) return null;

      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return null;

      parsed.setHours(0, 0, 0, 0);
      return parsed;
    };

    const pendingFutureMatches = sortedMatches
      .filter((match) => {
        if (match.resultado !== "Pendiente") return false;
        const date = parseMatchDate(match);
        return date ? date >= today : false;
      })
      .sort((a, b) => {
        const dateA = parseMatchDate(a)?.getTime() ?? Infinity;
        const dateB = parseMatchDate(b)?.getTime() ?? Infinity;
        return dateA - dateB;
      });

    if (pendingFutureMatches.length > 0) {
      return pendingFutureMatches[0];
    }

    const playedMatches = sortedMatches
      .filter((match) => match.resultado !== "Pendiente")
      .sort((a, b) => {
        const dateA = parseMatchDate(a)?.getTime() ?? 0;
        const dateB = parseMatchDate(b)?.getTime() ?? 0;
        return dateB - dateA;
      });

    if (playedMatches.length > 0) {
      return playedMatches[0];
    }

    return sortedMatches[0] || null;
  }, [sortedMatches]);

  const featuredScorers = useMemo(() => {
    if (!featuredMatch?.scorers?.length) return [];

    return (
      featuredMatch.scorers as {
        player_name: string;
        goals: number;
      }[]
    )
      .filter((scorer) => Number(scorer.goals || 0) > 0)
      .map((scorer) => ({
        name: scorer.player_name,
        goals: Number(scorer.goals || 0),
      }));
  }, [featuredMatch]);

  const featuredPhoto = useMemo(() => {
    return featuredMatch?.match_photos?.[0]?.public_url || heroImage || "";
  }, [featuredMatch, heroImage]);

  function getResultLabel(match: MatchRow | null) {
    if (!match) return "Sin partidos cargados";
    if (match.resultado === "Ganado") return "Victoria";
    if (match.resultado === "Empatado") return "Empate";
    if (match.resultado === "Perdido") return "Derrota";
    return "Próximo partido";
  }

  async function addMatch() {
    if (!newMatch.rival.trim() || !newMatch.fecha.trim()) return;

    try {
      setSaving(true);

      const golesString = selectionsToInput(newMatchGoalSelections);
      const gf = newMatchGoalSelections.length;

      const created = await createMatch({
        rival: newMatch.rival,
        fecha: newMatch.fecha,
        fecha_partido: newMatch.fecha,
        resultado: newMatch.resultado,
        goles_a_favor: gf,
        goles_en_contra: newMatch.goles_en_contra,
      });

      await replaceScorers(created.id, golesString);

      setNewMatch({
        rival: "",
        fecha: "",
        fecha_partido: "",
        resultado: "Pendiente",
        goles_a_favor: 0,
        goles_en_contra: 0,
        goles: "",
      });
      setSelectedNewMatchPlayer(plantel[0] || "");
      setNewMatchGoalSelections([]);
      setShowForm(false);

      await loadMatches();
    } catch (error) {
      console.error("ADD MATCH ERROR:", error);
      alert("Error guardando partido");
    } finally {
      setSaving(false);
    }
  }

  async function updateMatchField(
    id: string,
    patch: Partial<
      Pick<
        MatchRow,
        "resultado" | "goles_a_favor" | "goles_en_contra" | "rival" | "fecha"
      >
    >
  ) {
    try {
      await updateMatch(id, patch);
      setMatches((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    } catch (error) {
      console.error("UPDATE MATCH ERROR:", error);
      alert("Error actualizando partido");
    }
  }

  async function saveScorers(matchId: string) {
    try {
      const goles = goalInputs[matchId] || "";
      const gf = (goalSelections[matchId] || []).length;

      await updateMatch(matchId, { goles_a_favor: gf });
      await replaceScorers(matchId, goles);

      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? { ...m, goles_a_favor: gf } : m))
      );

      await loadMatches();
    } catch (error) {
      console.error("SAVE SCORERS ERROR:", error);
      alert("Error guardando goleadores");
    }
  }

  function addGoalSelection(matchId: string) {
    const selectedPlayer = selectedPlayerByMatch[matchId];
    if (!selectedPlayer) return;

    setGoalSelections((prev) => {
      const nextSelections = {
        ...prev,
        [matchId]: [...(prev[matchId] || []), selectedPlayer],
      };

      setGoalInputs((prevInputs) => ({
        ...prevInputs,
        [matchId]: selectionsToInput(nextSelections[matchId]),
      }));

      return nextSelections;
    });
  }

  function removeGoalSelection(matchId: string, index: number) {
    setGoalSelections((prev) => {
      const current = [...(prev[matchId] || [])];
      current.splice(index, 1);

      const nextSelections = {
        ...prev,
        [matchId]: current,
      };

      setGoalInputs((prevInputs) => ({
        ...prevInputs,
        [matchId]: selectionsToInput(current),
      }));

      return nextSelections;
    });
  }

  function addNewMatchGoalSelection() {
    if (!selectedNewMatchPlayer) return;

    const nextSelections = [...newMatchGoalSelections, selectedNewMatchPlayer];
    setNewMatchGoalSelections(nextSelections);
    setNewMatch((prev) => ({
      ...prev,
      goles_a_favor: nextSelections.length,
      goles: selectionsToInput(nextSelections),
    }));
  }

  function removeNewMatchGoalSelection(index: number) {
    const current = [...newMatchGoalSelections];
    current.splice(index, 1);
    setNewMatchGoalSelections(current);
    setNewMatch((prev) => ({
      ...prev,
      goles_a_favor: current.length,
      goles: selectionsToInput(current),
    }));
  }

  async function handlePhotoUpload(matchId: string, files: FileList) {
    try {
      await uploadMatchPhotos(matchId, files);
      await loadMatches();
    } catch (error) {
      console.error("UPLOAD PHOTO ERROR:", error);
      alert("Error subiendo fotos");
    }
  }

  async function handleDeletePhoto(photoId: string, photoUrl: string) {
    try {
      await deleteMatchPhoto(photoId, photoUrl);
      await loadMatches();
    } catch (error) {
      console.error("DELETE PHOTO ERROR:", error);
      alert("Error borrando foto");
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0f172a 0%, #111827 45%, #1f2937 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
          fontSize: "20px",
          fontWeight: 700,
        }}
      >
        Cargando La Banda de Aubasa...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px",
        fontFamily: "sans-serif",
        color: "#f9fafb",
        background:
          "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), repeating-linear-gradient(90deg, #14532d 0px, #14532d 80px, #166534 80px, #166534 160px)",
      }}
    >
      {/* =========================
          HERO PRINCIPAL
      ========================= */}
      {/* Logo personal (esquina) */}
<img
  src="/rosky.jpeg"
  alt="Rosky Seoane"
  style={{
    position: "absolute",
    top: "16px",
right: "16px",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    opacity: 0.85,
    boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
    border: "2px solid rgba(255,255,255,0.2)",
    zIndex: 2,
  }}
/>
      <div
        style={{
          position: "relative",
          borderRadius: "32px",
          padding: "64px 24px 44px",
          marginBottom: "24px",
          textAlign: "center",
          overflow: "hidden",
          border: "1px solid rgba(250,204,21,0.18)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
          background:
            featuredPhoto
              ? `linear-gradient(rgba(0,0,0,0.58), rgba(0,0,0,0.85)), url('${featuredPhoto}') center/cover no-repeat`
              : "linear-gradient(rgba(0,0,0,0.58), rgba(0,0,0,0.85)), repeating-linear-gradient(90deg, #14532d 0px, #14532d 80px, #166534 80px, #166534 160px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/escudo.png')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "420px",
            opacity: 0.09,
            filter: "blur(1px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 18px",
              borderRadius: "999px",
              background: "rgba(250,204,21,0.12)",
              border: "1px solid rgba(250,204,21,0.22)",
              color: "#fde68a",
              fontWeight: 900,
              marginBottom: "18px",
            }}
          >
            <span>⚽</span>
            <span>Fútbol · SUTPA · AUBASA</span>
          </div>

          <img
            src="/escudo.png"
            alt="Escudo La Banda de Aubasa"
            style={{
              width: "118px",
              marginBottom: "14px",
              filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.35))",
            }}
          />

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(34px, 6vw, 58px)",
              fontWeight: 900,
              color: "#facc15",
              letterSpacing: "-0.03em",
              textShadow: "0 6px 22px rgba(0,0,0,0.32)",
            }}
          >
            LA BANDA DE AUBASA
          </h1>

          <p
            style={{
              marginTop: "12px",
              marginBottom: 0,
              color: "#e5e7eb",
              fontWeight: 600,
              fontSize: "16px",
            }}
          >
            Fixture · Goleadores · Partidos · Plantel · Videos · Galería
          </p>

          {featuredMatch && (
            <div
              style={{
                maxWidth: "620px",
                margin: "26px auto 0",
                padding: "18px 18px 16px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                boxShadow: "0 16px 36px rgba(0,0,0,0.22)",
              }}
            >
              <div
                style={{
                  color: "#fde68a",
                  fontWeight: 900,
                  fontSize: "13px",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {getResultLabel(featuredMatch)}
              </div>

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 900,
                  marginTop: "8px",
                }}
              >
                Aubasa vs {featuredMatch.rival}
              </div>

              <div
                style={{
                  color: "#cbd5e1",
                  marginTop: "8px",
                  fontWeight: 600,
                }}
              >
                {formatDate(featuredMatch.fecha_partido || featuredMatch.fecha)}
              </div>

              {featuredMatch.resultado !== "Pendiente" && (
                <>
                  <div
                    style={{
                      marginTop: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      fontWeight: 800,
                    }}
                  >
                    <span>Resultado:</span>
                    <span>
                      {featuredMatch.goles_a_favor ?? 0} -{" "}
                      {featuredMatch.goles_en_contra ?? 0}
                    </span>
                  </div>

                  {featuredScorers.length > 0 && (
                    <div
                      style={{
                        marginTop: "14px",
                        color: "#e5e7eb",
                        fontWeight: 700,
                        fontSize: "14px",
                      }}
                    >
                      Goles:{" "}
                      {featuredScorers
                        .map((s) =>
                          s.goals > 1 ? `${s.name} (${s.goals})` : s.name
                        )
                        .join(", ")}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

            {/* =========================
          NAVEGACIÓN PRINCIPAL
      ========================= */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "22px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {(
          [
            { key: "tabla", label: "Grupos" },
            { key: "fixture", label: "Fixture" },
            { key: "goleadores", label: "Goleadores" },
            { key: "partidos", label: "Partidos" },
            { key: "plantel", label: "Plantel" },
            { key: "videos", label: "Videos / vivo" },
            { key: "galeria", label: "Galería" },
          ] as const
        ).map((tab) => {
          const isActive = screen === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setScreen(tab.key)}
              style={{
                border: isActive
                  ? "1px solid rgba(250,204,21,0.85)"
                  : "1px solid rgba(255,255,255,0.10)",
                background: isActive
                  ? "linear-gradient(180deg, #facc15 0%, #eab308 100%)"
                  : "rgba(255,255,255,0.04)",
                color: isActive ? "#111827" : "#f9fafb",
                padding: "12px 20px",
                borderRadius: "16px",
                cursor: "pointer",
                fontWeight: 900,
                boxShadow: isActive
                  ? "0 10px 24px rgba(250,204,21,0.22)"
                  : "0 8px 18px rgba(0,0,0,0.12)",
                backdropFilter: "blur(8px)",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* =========================
          ADMIN NUEVO PARTIDO
      ========================= */}
      {isAdmin && (
        <div style={{ display: "grid", gap: "14px", marginBottom: "22px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              style={{
                border: "none",
                background: showForm ? "#ef4444" : "#facc15",
                color: "#111827",
                padding: "12px 16px",
                borderRadius: "12px",
                cursor: "pointer",
                fontWeight: 900,
                boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
              }}
            >
              {showForm ? "Cerrar formulario" : "ADMIN · Nuevo partido"}
            </button>
          </div>

          {showForm && (
            <div
              style={{
                padding: "20px",
                borderRadius: "18px",
                background: "rgba(17,24,39,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "grid",
                gap: "12px",
                maxWidth: "760px",
              }}
            >
              <h3 style={{ margin: 0 }}>Nuevo partido</h3>

              <input
                type="text"
                placeholder="Rival"
                value={newMatch.rival}
                onChange={(e) =>
                  setNewMatch((prev) => ({ ...prev, rival: e.target.value }))
                }
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "#0f172a",
                  color: "#fff",
                }}
              />

              <input
                type="date"
                value={newMatch.fecha}
                onChange={(e) =>
                  setNewMatch((prev) => ({
                    ...prev,
                    fecha: e.target.value,
                    fecha_partido: e.target.value,
                  }))
                }
                style={{
                  padding: "10px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "#0f172a",
                  color: "#fff",
                }}
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      color: "#cbd5e1",
                      fontSize: "12px",
                      fontWeight: 800,
                      marginBottom: "8px",
                    }}
                  >
                    GOLES EN CONTRA
                  </div>

                  <input
                    type="number"
                    value={newMatch.goles_en_contra}
                    onChange={(e) =>
                      setNewMatch((prev) => ({
                        ...prev,
                        goles_en_contra: Number(e.target.value),
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "#0f172a",
                      color: "#fff",
                    }}
                  />
                </div>

                <div
                  style={{
                    padding: "14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      color: "#cbd5e1",
                      fontSize: "12px",
                      fontWeight: 800,
                      marginBottom: "8px",
                    }}
                  >
                    RESULTADO
                  </div>

                  <select
                    value={newMatch.resultado}
                    onChange={(e) =>
                      setNewMatch((prev) => ({
                        ...prev,
                        resultado: e.target.value as MatchRow["resultado"],
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "#0f172a",
                      color: "#fff",
                    }}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Ganado">Ganado</option>
                    <option value="Empatado">Empatado</option>
                    <option value="Perdido">Perdido</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginTop: "6px",
                  padding: "16px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: "10px" }}>
                  Goleadores del nuevo partido
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <select
                    value={selectedNewMatchPlayer}
                    onChange={(e) => setSelectedNewMatchPlayer(e.target.value)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.14)",
                      background: "#111827",
                      color: "#fff",
                    }}
                  >
                    {plantel.map((player) => (
                      <option key={player} value={player}>
                        {player}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={addNewMatchGoalSelection}
                    style={{
                      border: "none",
                      background: "#facc15",
                      color: "#111827",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    Agregar gol
                  </button>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  {newMatchGoalSelections.length === 0 ? (
                    <div style={{ color: "#9ca3af" }}>
                      No hay goles cargados.
                    </div>
                  ) : (
                    newMatchGoalSelections.map((player, index) => (
                      <div
                        key={`new-${player}-${index}`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "8px",
                          border: "1px solid rgba(255,255,255,0.08)",
                          padding: "10px 12px",
                          borderRadius: "12px",
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <span>
                          Gol {index + 1}: {player}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeNewMatchGoalSelection(index)}
                          style={{
                            border: "none",
                            background: "rgba(239,68,68,0.18)",
                            color: "#fecaca",
                            padding: "8px 10px",
                            borderRadius: "10px",
                            cursor: "pointer",
                            fontWeight: 800,
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={addMatch}
                disabled={saving}
                style={{
                  background: saving ? "#64748b" : "#22c55e",
                  color: "#052e16",
                  padding: "12px",
                  borderRadius: "10px",
                  fontWeight: 900,
                  border: "none",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando..." : "Guardar partido"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================
          PANTALLA VIDEOS / VIVO
      ========================= */}
      {screen === "videos" && (
        <div style={{ display: "grid", gap: "20px" }}>
          <div
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "24px",
              background:
                "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.8)), repeating-linear-gradient(90deg, #14532d 0px, #14532d 80px, #166534 80px, #166534 160px)",
              borderRadius: "22px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Videos / vivo</h2>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "14px 20px",
                  borderRadius: "16px",
                  textDecoration: "none",
                  fontWeight: 900,
                  background: "#dc2626",
                  color: "#fff",
                }}
              >
                Ver vivo
              </a>

              <a
                href={latestVideoUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: "14px 20px",
                  borderRadius: "16px",
                  textDecoration: "none",
                  fontWeight: 900,
                  background: "#facc15",
                  color: "#111827",
                }}
              >
                Ver último video
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          PANTALLA PARTIDOS
      ========================= */}
      {screen === "partidos" && (
        <div style={{ display: "grid", gap: "16px" }}>
          {sortedMatches.length === 0 ? (
            <div
              style={{
                padding: "24px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              No hay partidos cargados.
            </div>
          ) : (
            sortedMatches.map((m) => {
              const gfActual = (goalSelections[m.id] || []).length;

              return (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "18px",
                    background:
                      "repeating-linear-gradient(90deg, #14532d 0px, #14532d 40px, #166534 40px, #166534 80px)",
                    borderRadius: "22px",
                    boxShadow: "0 16px 36px rgba(0,0,0,0.18)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "12px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "22px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        Aubasa vs {m.rival}
                      </div>
                      <div style={{ color: "#cbd5e1", marginTop: "4px" }}>
                        Fecha: {formatDate(m.fecha_partido || m.fecha)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: "14px",
                        background:
                          m.resultado === "Ganado"
                            ? "rgba(34,197,94,0.16)"
                            : m.resultado === "Empatado"
                            ? "rgba(250,204,21,0.16)"
                            : m.resultado === "Perdido"
                            ? "rgba(239,68,68,0.16)"
                            : "rgba(148,163,184,0.14)",
                        color:
                          m.resultado === "Ganado"
                            ? "#86efac"
                            : m.resultado === "Empatado"
                            ? "#fde68a"
                            : m.resultado === "Perdido"
                            ? "#fca5a5"
                            : "#cbd5e1",
                        fontWeight: 900,
                      }}
                    >
                      {m.resultado}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                      marginTop: "16px",
                    }}
                  >
                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "16px",
                        background: "rgba(250,204,21,0.08)",
                        border: "1px solid rgba(250,204,21,0.2)",
                      }}
                    >
                      <div
                        style={{
                          color: "#fde68a",
                          fontSize: "12px",
                          fontWeight: 800,
                        }}
                      >
                        GOLES A FAVOR
                      </div>
                      <div style={{ fontSize: "30px", fontWeight: 900 }}>
                        {gfActual}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          color: "#cbd5e1",
                          fontSize: "12px",
                          fontWeight: 800,
                        }}
                      >
                        GOLES EN CONTRA
                      </div>

                      {isAdmin ? (
                        <input
                          type="number"
                          value={m.goles_en_contra}
                          onChange={(e) =>
                            updateMatchField(m.id, {
                              goles_en_contra: Number(e.target.value),
                            })
                          }
                          style={{
                            width: "100%",
                            marginTop: "8px",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "#0f172a",
                            color: "#fff",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            background: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "#fff",
                            fontWeight: 800,
                          }}
                        >
                          {m.goles_en_contra ?? 0}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        padding: "14px",
                        borderRadius: "16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          color: "#cbd5e1",
                          fontSize: "12px",
                          fontWeight: 800,
                        }}
                      >
                        RESULTADO
                      </div>

                      {isAdmin ? (
                        <select
                          value={m.resultado}
                          onChange={(e) =>
                            updateMatchField(m.id, {
                              resultado: e.target
                                .value as MatchRow["resultado"],
                            })
                          }
                          style={{
                            width: "100%",
                            marginTop: "8px",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "#0f172a",
                            color: "#fff",
                          }}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Ganado">Ganado</option>
                          <option value="Empatado">Empatado</option>
                          <option value="Perdido">Perdido</option>
                        </select>
                      ) : (
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "10px 12px",
                            borderRadius: "12px",
                            background: "#0f172a",
                            border: "1px solid rgba(255,255,255,0.12)",
                            color: "#fff",
                            fontWeight: 800,
                          }}
                        >
                          {m.resultado}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "16px",
                      padding: "16px",
                      borderRadius: "18px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: "10px" }}>
                      Goleadores
                    </div>

                    {isAdmin ? (
                      <>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            marginTop: "8px",
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <select
                            value={
                              selectedPlayerByMatch[m.id] || plantel[0] || ""
                            }
                            onChange={(e) =>
                              setSelectedPlayerByMatch((prev) => ({
                                ...prev,
                                [m.id]: e.target.value,
                              }))
                            }
                            style={{
                              padding: "10px 12px",
                              borderRadius: "12px",
                              border: "1px solid rgba(255,255,255,0.14)",
                              background: "#111827",
                              color: "#fff",
                            }}
                          >
                            {plantel.map((player) => (
                              <option key={player} value={player}>
                                {player}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => addGoalSelection(m.id)}
                            style={{
                              border: "none",
                              background: "#facc15",
                              color: "#111827",
                              padding: "10px 14px",
                              borderRadius: "12px",
                              cursor: "pointer",
                              fontWeight: 900,
                            }}
                          >
                            Agregar gol
                          </button>

                          <button
                            type="button"
                            onClick={() => saveScorers(m.id)}
                            style={{
                              border: "none",
                              background: "#22c55e",
                              color: "#052e16",
                              padding: "10px 14px",
                              borderRadius: "12px",
                              cursor: "pointer",
                              fontWeight: 900,
                            }}
                          >
                            Guardar goleadores
                          </button>
                        </div>

                        <div
                          style={{
                            marginTop: "12px",
                            display: "grid",
                            gap: "8px",
                          }}
                        >
                          {(goalSelections[m.id] || []).length === 0 ? (
                            <div style={{ color: "#9ca3af" }}>
                              No hay goles cargados.
                            </div>
                          ) : (
                            (goalSelections[m.id] || []).map(
                              (player, index) => (
                                <div
                                  key={`${m.id}-${player}-${index}`}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "8px",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    padding: "10px 12px",
                                    borderRadius: "12px",
                                    background: "rgba(255,255,255,0.04)",
                                  }}
                                >
                                  <span>
                                    Gol {index + 1}: {player}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeGoalSelection(m.id, index)
                                    }
                                    style={{
                                      border: "none",
                                      background: "rgba(239,68,68,0.18)",
                                      color: "#fecaca",
                                      padding: "8px 10px",
                                      borderRadius: "10px",
                                      cursor: "pointer",
                                      fontWeight: 800,
                                    }}
                                  >
                                    Quitar
                                  </button>
                                </div>
                              )
                            )
                          )}
                        </div>

                        <input
                          type="hidden"
                          value={goalInputs[m.id] || ""}
                          readOnly
                        />
                      </>
                    ) : (
                      <div
                        style={{
                          marginTop: "12px",
                          display: "grid",
                          gap: "8px",
                        }}
                      >
                        {(goalSelections[m.id] || []).length === 0 ? (
                          <div style={{ color: "#9ca3af" }}>
                            No hay goles cargados.
                          </div>
                        ) : (
                          (goalSelections[m.id] || []).map((player, index) => (
                            <div
                              key={`${m.id}-${player}-${index}`}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "8px",
                                border: "1px solid rgba(255,255,255,0.08)",
                                padding: "10px 12px",
                                borderRadius: "12px",
                                background: "rgba(255,255,255,0.04)",
                              }}
                            >
                              <span>
                                Gol {index + 1}: {player}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =========================
          PANTALLA GALERÍA
      ========================= */}
      {screen === "galeria" && (
        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {isAdmin && (
            <div
              style={{
                display: "grid",
                gap: "14px",
                padding: "16px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: "16px" }}>
                  Subir fotos a la galería
                </div>
                <div style={{ color: "#cbd5e1", marginTop: "4px" }}>
                  Elegí el partido al que querés asociar las fotos.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  value={galleryUploadMatchId}
                  onChange={(e) => setGalleryUploadMatchId(e.target.value)}
                  style={{
                    flex: "1 1 260px",
                    minWidth: "220px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  <option value="">Seleccionar partido</option>
                  {sortedMatches.map((match) => (
                    <option key={match.id} value={match.id}>
                      {formatDate(match.fecha_partido || match.fecha)} - Aubasa
                      {" vs "}
                      {match.rival}
                    </option>
                  ))}
                </select>

                <label
                  style={{
                    display: "inline-block",
                    border: "1px solid rgba(255,255,255,0.12)",
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: "#facc15",
                    color: "#111827",
                    borderRadius: "12px",
                    fontWeight: 900,
                    opacity: galleryUploadMatchId ? 1 : 0.6,
                  }}
                >
                  Subir fotos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    disabled={!galleryUploadMatchId}
                    onChange={(e) => {
                      const files = e.target.files;

                      if (!galleryUploadMatchId) {
                        alert("Primero seleccioná un partido");
                        return;
                      }

                      if (files && files.length > 0) {
                        handlePhotoUpload(galleryUploadMatchId, files);
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {galleryPhotos.length === 0 ? (
            <div
              style={{
                padding: "20px",
                borderRadius: "18px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              No hay fotos todavía.
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
              }}
            >
              {galleryPhotos.map((photo, i) => (
                <div
                  key={photo.id}
                  style={{
                    position: "relative",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <img
                    src={photo.url}
                    alt={`galeria-${i}`}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      cursor: "pointer",
                      display: "block",
                    }}
                    onClick={() =>
                      setViewer({
                        images: galleryPhotos.map((p) => p.url),
                        index: i,
                      })
                    }
                  />

                  <div
                    style={{
                      padding: "10px 12px",
                      background: "rgba(0,0,0,0.45)",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: "14px" }}>
                      Aubasa vs {photo.rival || "Sin rival"}
                    </div>
                    <div style={{ color: "#cbd5e1", fontSize: "13px" }}>
                      {photo.fecha ? formatDate(photo.fecha) : "Sin fecha"}
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() =>
                        handleDeletePhoto(photo.id, photo.storagePath)
                      }
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        border: "none",
                        background: "rgba(220,38,38,0.9)",
                        color: "#fff",
                        padding: "8px 10px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      Borrar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================
          PANTALLA GOLEADORES
      ========================= */}
      {screen === "goleadores" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderRadius: "22px",
              background: "rgba(17,24,39,0.88)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Resumen general</h2>

            <div style={{ display: "grid", gap: "10px" }}>
              {[
                ["PJ", stats.pj],
                ["PG", stats.pg],
                ["PE", stats.pe],
                ["PP", stats.pp],
                ["GF", stats.gf],
                ["GC", stats.gc],
                ["DG", stats.dg],
                ["PTS", stats.pts],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontWeight: 800,
                  }}
                >
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "20px",
              borderRadius: "22px",
              background: "rgba(17,24,39,0.88)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: "16px" }}>
              Ranking de goleadores
            </h2>

            {stats.topScorers.length === 0 ? (
              <div style={{ color: "#9ca3af" }}>
                No hay goleadores cargados.
              </div>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {stats.topScorers.map((g, i) => (
                  <div
                    key={`${g.nombre}-${i}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "14px 16px",
                      borderRadius: "16px",
                      background:
                        i === 0
                          ? "linear-gradient(90deg, rgba(250,204,21,0.18), rgba(255,255,255,0.05))"
                          : i === 1
                          ? "linear-gradient(90deg, rgba(226,232,240,0.14), rgba(255,255,255,0.05))"
                          : i === 2
                          ? "linear-gradient(90deg, rgba(251,146,60,0.16), rgba(255,255,255,0.05))"
                          : "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          minWidth: "54px",
                          textAlign: "center",
                          fontWeight: 900,
                          fontSize: "18px",
                        }}
                      >
                        {getRankLabel(i)}
                      </div>
                      <div style={{ fontWeight: 800 }}>{g.nombre}</div>
                    </div>

                    <div
                      style={{
                        minWidth: "58px",
                        textAlign: "center",
                        padding: "8px 10px",
                        borderRadius: "999px",
                        background: "rgba(255,255,255,0.08)",
                        fontWeight: 900,
                      }}
                    >
                      {g.goles}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================
          PANTALLA PLANTEL
      ========================= */}
      {screen === "plantel" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "18px",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderRadius: "22px",
              background: "rgba(17,24,39,0.88)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Plantel</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              {plantel.map((jugador, i) => (
                <div
                  key={jugador}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontWeight: 700,
                  }}
                >
                  {i + 1}. {jugador}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "20px",
              borderRadius: "22px",
              background: "rgba(17,24,39,0.88)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Cuerpo técnico</h2>
            <div style={{ display: "grid", gap: "10px" }}>
              {cuerpoTecnico.map((dt) => (
                <div
                  key={dt}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    fontWeight: 700,
                  }}
                >
                  {dt}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =========================
          PLACEHOLDERS
      ========================= */}
                  {screen === "tabla" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "18px",
          }}
        >
          {[
            {
              nombre: "Grupo A",
              equipos: [
                "SUTPA Pilar",
                "Hudson F.C.",
                "Banda de Aubasa",
                "Guidoneta",
              ],
            },
            {
              nombre: "Grupo B",
              equipos: [
                "Obrador 202",
                "Dep Riccheri",
                "El Docke",
                "El Oeste",
              ],
            },
            {
              nombre: "Grupo C",
              equipos: ["Flavioneta", "Croacia F.C.", "Obrador Ruta 4"],
            },
          ].map((grupo) => (
            <div
              key={grupo.nombre}
              style={{
                padding: "20px",
                borderRadius: "22px",
                background: "rgba(17,24,39,0.88)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 16px 36px rgba(0,0,0,0.18)",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  marginBottom: "16px",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  background: "rgba(250,204,21,0.12)",
                  border: "1px solid rgba(250,204,21,0.22)",
                  color: "#fde68a",
                  fontWeight: 900,
                  fontSize: "14px",
                }}
              >
                {grupo.nombre}
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "70px 1fr",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontWeight: 900,
                    color: "#fde68a",
                  }}
                >
                  <div>Pos</div>
                  <div>Equipo</div>
                </div>

                {grupo.equipos.map((equipo, index) => {
                  const esAubasa = equipo === "Banda de Aubasa";

                  return (
                    <div
                      key={equipo}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "70px 1fr",
                        gap: "10px",
                        alignItems: "center",
                        padding: "14px 16px",
                        borderRadius: "16px",
                        background: esAubasa
                          ? "linear-gradient(90deg, rgba(250,204,21,0.18), rgba(255,255,255,0.04))"
                          : "rgba(255,255,255,0.04)",
                        border: esAubasa
                          ? "1px solid rgba(250,204,21,0.28)"
                          : "1px solid rgba(255,255,255,0.06)",
                        fontWeight: esAubasa ? 900 : 700,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "42px",
                          borderRadius: "12px",
                          background: esAubasa
                            ? "rgba(250,204,21,0.18)"
                            : "rgba(255,255,255,0.06)",
                          color: esAubasa ? "#fde68a" : "#f9fafb",
                          fontWeight: 900,
                        }}
                      >
                        {index + 1}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{equipo}</span>

                        {esAubasa && (
                          <span
                            style={{
                              padding: "6px 10px",
                              borderRadius: "999px",
                              background: "#facc15",
                              color: "#111827",
                              fontSize: "12px",
                              fontWeight: 900,
                            }}
                          >
                            AUBASA
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* =========================
          PANEL ADMIN / SESIÓN
      ========================= */}
      <div
        style={{
          marginTop: "40px",
          padding: "16px",
          borderRadius: "18px",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
        }}
      >
        {!userEmail ? (
          <form
            onSubmit={handleLogin}
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
              width: "100%",
            }}
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                flex: "1 1 220px",
                minWidth: "220px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#111827",
                color: "#f9fafb",
                outline: "none",
              }}
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                flex: "1 1 220px",
                minWidth: "220px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#111827",
                color: "#f9fafb",
                outline: "none",
              }}
            />

            <button
              type="submit"
              style={{
                padding: "12px 18px",
                borderRadius: "12px",
                border: "none",
                background: "#facc15",
                color: "#111827",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Iniciar sesión
            </button>
          </form>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <div
              style={{
                color: isAdmin ? "#86efac" : "#d1d5db",
                fontWeight: 700,
              }}
            >
              Sesión iniciada: {userEmail}
              {isAdmin ? " (admin)" : ""}
            </div>

            <button
              onClick={handleLogout}
              style={{
                padding: "12px 18px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#111827",
                color: "#f9fafb",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      {/* =========================
          LIGHTBOX / VISOR DE FOTOS
      ========================= */}
      {viewer && (
        <Lightbox
          images={viewer.images}
          startIndex={viewer.index}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}