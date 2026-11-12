import AboutSection from '../components/home/AboutSection.jsx';
import DataSourcesSection from '../components/home/DataSourcesSection.jsx';
import HeroSection from '../components/home/HeroSection.jsx';
import HowItWorksSection from '../components/home/HowItWorksSection.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function HomePage() {
  useDocumentTitle(null);

  return (
    <>
      <HeroSection />
      <AboutSection />
      <HowItWorksSection />
      <DataSourcesSection />
    </>
  );
}
