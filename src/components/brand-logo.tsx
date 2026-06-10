import logoAsset from "@/assets/logo-ad.png.asset.json";

export function BrandLogo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Assembleia de Deus - Ministério Setor 70"
      className={className}
    />
  );
}
