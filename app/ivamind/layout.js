import '../globals.css';
import { IvamindChrome } from '@/src/components/studio-chrome';
import { JOBS, BUDGET, EPISODES } from '@/src/data/ivamind-mock';

export const metadata = {
  title: 'IVAMIND Studio — halal manga production suite',
  description: 'Audio-first manga anime pipeline for TikTok islam series. Gemini + Kling + Fish + ElevenLabs BYOK.',
};

export default function IvamindRootLayout({ children }) {
  const activeEpisode = EPISODES.find(e => e.active) || EPISODES.find(e => e.running);
  return (
    <IvamindChrome
      breadcrumbs={['IVAMIND Studio', 'Season 1']}
      episode={activeEpisode}
      jobs={JOBS}
      budget={BUDGET}
    >
      {children}
    </IvamindChrome>
  );
}
