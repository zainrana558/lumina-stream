'use client';

import { useState, useEffect } from 'react';

const TRIVIA: Record<string, string[]> = {
  anime: [
    'Spirited Away is the highest-grossing anime film of all time, earning $395M worldwide',
    'One Piece has over 1,100 episodes and counting since 1999',
    'Studio Ghibli was founded in 1985 by Hayao Miyazaki and Isao Takahata',
    'Attack on Titan has sold over 140 million copies worldwide',
    'Dragon Ball Z was inspired by Journey to the West, a 16th-century Chinese novel',
    'Cowboy Bebop had only 26 episodes but became one of the most influential anime ever',
    'Akira was the first anime to use pre-recorded voice acting instead of post-recording',
    'Neon Genesis Evangelion almost bankrupted its studio due to production costs',
    'Manga outsells American comic books by more than 3 to 1 globally',
    'The word "anime" is derived from the English word "animation"',
    'Fullmetal Alchemist: Brotherhood has a near-perfect 9.1 rating on MAL',
    'Naruto was initially rejected by multiple publishers before Shonen Jump accepted it',
  ],
  cartoon: [
    'SpongeBob SquarePants has aired over 280 episodes since 1999',
    'The Simpsons is the longest-running scripted primetime TV show in history',
    'Avatar: The Last Airbender was originally conceived as a single-season series',
    'Looney Tunes characters were created in the 1930s and are still popular today',
    'Adventure Time was initially rejected by Nickelodeon before being picked up by Cartoon Network',
    'Rick and Morty started as a parody of Back to the Future',
    'Phineas and Ferb holds the record for most Disney Channel original episodes',
    'The first animated feature film was El Apóstol in 1917',
    'Toy Story was the first fully computer-animated feature film in history',
    'Scooby-Doo has been running in various forms since 1969',
  ],
  horror: [
    'The Shining was shot in just 13 weeks at the actual Timberline Lodge',
    'Psycho (1960) was the first film to show a flushing toilet on screen',
    'A Nightmare on Elm Street was inspired by real news stories about nightmare deaths',
    'The Exorcist (1973) caused people to faint in theaters worldwide',
    'Frankenstein (1931) was so scary that a woman fainted and sued the studio',
    'Stephen King has published over 64 novels, mostly horror and suspense',
    'Nosferatu (1922) nearly vanished forever due to copyright lawsuits from Bram Stoker\'s estate',
    'The Texas Chain Saw Massacre was filmed in just 4 days',
    'Boris Karloff\'s Frankenstein makeup took 4 hours to apply each day',
    'Halloween (1978) was made on a budget of just $325,000 and grossed $70M',
  ],
  romance: [
    'Titanic held the #1 box office spot for 15 consecutive weeks in 1997-98',
    'Pride and Prejudice has been adapted for screen over 20 times',
    'Before Sunrise was filmed in just 15 days in Vienna',
    'Casablanca was written with an unfinished script during filming',
    'The Notebook was based on Nicholas Sparks\' real-life wife\'s grandparents',
    'La La Land used 98% practical lighting instead of CGI effects',
    'Jane Austen published all her novels anonymously during her lifetime',
    'Romeo and Juliet was set in the 1300s but Shakespeare set it in his own era',
    'The Princess Bride took 15 years to get from book to screen',
    'Amélie was shot entirely on location in Montmartre, Paris',
  ],
  mystery: [
    'Alfred Hitchcock directed over 50 films and is called the Master of Suspense',
    'Gone Girl was written by Gillian Flynn in just 7 months',
    'The Girl with the Dragon Tattoo was originally titled "Men Who Hate Women" in Swedish',
    'Sherlock Holmes has been portrayed in over 250 films and TV shows',
    'Agatha Christie wrote 66 detective novels and sold over 2 billion books',
    'Se7en was filmed with a completely dark, rainy palette on purpose',
    'The Usual Suspects was filmed in just 35 days on a $6M budget',
    'True Detective season 1 used a single take 6-minute scene shot in one continuous shot',
    'Knives Out was Rian Johnson\'s love letter to classic whodunit mysteries',
    'David Fincher watched the Zodiac case files obsessively before making the film',
  ],
  fantasy: [
    'Lord of the Rings trilogy was filmed simultaneously over 438 days in New Zealand',
    'Harry Potter is the best-selling book series in history with 600M+ copies sold',
    'Game of Thrones spent $15M per episode in its final season',
    'The Wizard of Oz used technicolor at a time when most films were black and white',
    'C.S. Lewis and J.R.R. Tolkien were close friends and shared their works in progress',
    'Pan\'s Labyrinth used 95% practical effects and minimal CGI',
    'The Witcher started as a series of Polish short stories in the 1980s',
    'Studio Ghibli\'s Spirited Away won the Oscar for Best Animated Feature in 2003',
    'The Chronicles of Narnia has sold over 100 million copies in 47 languages',
    'Brandon Sanderson\'s Stormlight Archive books average 1,000+ pages each',
  ],
};

interface GenreTriviaProps {
  genre: string;
  color?: string;
}

export default function GenreTrivia({ genre, color = 'rgba(255,245,232,.35)' }: GenreTriviaProps) {
  const [fact, setFact] = useState('');
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const facts = TRIVIA[genre];
    if (!facts || facts.length === 0) return;

    // Pick random initial fact
    setFact(facts[Math.floor(Math.random() * facts.length)]);

    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        let next: string;
        do {
          next = facts[Math.floor(Math.random() * facts.length)];
        } while (next === fact && facts.length > 1);
        setFact(next);
        setFading(false);
      }, 600);
    }, 12000); // Rotate every 12 seconds

    return () => clearInterval(interval);
  }, [genre, fact]);

  if (!fact) return null;

  return (
    <div style={{
      padding: '0 clamp(1rem,5vw,3rem)',
      marginBottom: '2rem',
      position: 'relative', zIndex: 3,
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 18px',
        borderRadius: 12,
        background: 'rgba(0,0,0,.3)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,.06)',
        maxWidth: 'clamp(300px,60vw,700px)',
        opacity: fading ? 0.3 : 1,
        transition: 'opacity 0.5s ease',
      }}>
        <span style={{
          fontSize: '.85rem',
          fontFamily: "'Crimson Pro',serif",
          color: color,
          flexShrink: 0,
          fontWeight: 600,
        }}>💡</span>
        <span style={{
          fontFamily: "'Crimson Pro',serif",
          fontSize: 'clamp(.72rem,.85vw,.82rem)',
          color: color,
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}>
          {fact}
        </span>
      </div>
    </div>
  );
}
