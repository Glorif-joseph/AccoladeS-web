"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Publicite = {
  id: string;
  image_url: string;
  lien_url: string | null;
};

const INTERVALLE_MS = 4000;
const DUREE_FONDU_MS = 300;

export default function PubCarousel() {
  const [publicites, setPublicites] = useState<Publicite[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("publicites")
        .select("id, image_url, lien_url")
        .eq("actif", true)
        .order("ordre", { ascending: true });
      setPublicites(data ?? []);
    })();
  }, []);

  useEffect(() => {
    if (publicites.length < 2) return;
    const intervalId = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % publicites.length);
        setVisible(true);
      }, DUREE_FONDU_MS);
    }, INTERVALLE_MS);
    return () => clearInterval(intervalId);
  }, [publicites.length]);

  if (publicites.length === 0) return null;

  const pubActuelle = publicites[index];

  const image = (
    <img
      src={pubActuelle.image_url}
      alt=""
      className="absolute inset-0 w-full h-full object-cover transition-opacity"
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${DUREE_FONDU_MS}ms`,
      }}
    />
  );

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {pubActuelle.lien_url ? (
        <a
          href={pubActuelle.lien_url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0"
        >
          {image}
        </a>
      ) : (
        image
      )}
      <div className="absolute inset-0 bg-black/35" />
    </div>
  );
}
