import Header from "../components/Layout/Header";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Header>
      <div className="max-w-7xl mx-auto">{children}</div>
    </Header>
  );
}
