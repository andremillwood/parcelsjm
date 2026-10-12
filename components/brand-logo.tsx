import Image from "next/image";
import Link from "next/link";
import logo from "../public/brand/parcels-ja-original.jpeg";

/** Unaltered owner-supplied logo. Do not create a derivative without approval. */
export function BrandLogo() {
  return (
    <Link href="/" className="brand-logo" aria-label="Parcels JA home">
      <Image
        src={logo}
        alt="Parcels JA — Freight, Shipping, Delivery"
        sizes="160px"
        priority
      />
    </Link>
  );
}
