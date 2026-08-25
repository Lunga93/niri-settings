import { ThemeProvider } from "./ThemeContext";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { ScreenshotGallery } from "./components/ScreenshotGallery";
import { Showcase } from "./components/Showcase";
import { Developer } from "./components/Developer";
import { Download } from "./components/Download";
import { ScrollToTop } from "./components/ScrollToTop";
import { Footer } from "./components/Footer";

function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <Navbar />
      <div className="min-h-screen overflow-x-hidden">
        <Hero />
        <Features />
        <ScreenshotGallery />
        <Showcase />
        <Developer />
        <Download />
        <Footer />
      </div>
      <ScrollToTop />
    </ThemeProvider>
  );
}

export default App;
