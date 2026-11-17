import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-card border border-line bg-card px-6 py-16 text-center">
      <p className="tabular text-6xl font-bold text-accent">404</p>
      <h1 className="text-2xl font-semibold">Esta página no existe</h1>
      <p className="max-w-md text-muted">
        Puede que el enlace esté mal escrito o que la página se haya movido.
      </p>
      <Link
        to="/"
        className="flex h-12 items-center rounded-full bg-hero px-6 font-semibold text-on-hero"
      >
        Volver al dashboard
      </Link>
    </section>
  );
}
