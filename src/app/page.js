import { ClientWebpageProvider } from '@/contexts/ClientWebpageContext';
import { ClientsContextProvider } from '@/contexts/ClientsContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Image from "next/image";
import MainPage from '@/components/mainPage/main-page'

export default function Home() {
  return (
    <ClientsContextProvider>
    <ClientWebpageProvider>
    <GoogleOAuthProvider clientId="55422186977-6sk7oa31qc0idj4k413b9btmagl4atu9.apps.googleusercontent.com">
      <main className="flex flex-col items-center justify-between min-h-screen">
        <MainPage/>
      </main>
    </GoogleOAuthProvider>
    </ClientWebpageProvider>
    </ClientsContextProvider>
  );
}