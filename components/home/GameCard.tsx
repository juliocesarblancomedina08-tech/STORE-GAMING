"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

type GameCardProps = {
  name: string;
  image: string;
  description?: string;
  path: string;
  badge?: string;
};

export default function GameCard({
  name,
  image,
  description,
  path,
  badge,
}: GameCardProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="game-card"
      onClick={() => router.push(path)}
    >
      <div className="game-image-container">
        <Image
          src={image}
          alt={name}
          fill
          sizes="(max-width: 700px) 100vw, 50vw"
          className="game-image"
        />

        {badge && (
          <span className="game-badge">
            {badge}
          </span>
        )}
      </div>

      <div className="game-info">
        <h3>{name}</h3>

        {description && (
          <p>{description}</p>
        )}

        <div className="game-bottom">
          <span>
            VER SERVICIO
          </span>

          <strong>→</strong>
        </div>
      </div>
    </button>
  );
}
