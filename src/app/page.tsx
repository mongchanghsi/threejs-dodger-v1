import Game from "./components/Game";

export default function Home() {
  return (
    <div className="relative w-screen h-screen flex items-center jusitfy-center bg-gradient-to-b from-blue-400 via-pink-400 to-orange-300">
      <Game />
    </div>
  );
}
