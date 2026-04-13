"use client";

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Sidebar from "../../components/Sidebar";
import NavTabs from "../../components/NavTabs";
import { Profile } from '../../components/types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://YOUR-BACKEND.onrender.com';

export default function SwipePage() {
  const [profiles, setProfiles] = useState<{ topUsers: Profile[]; matches: Profile[]; swipeDeck: Profile[] }>({
    topUsers: [],
    matches: [],
    swipeDeck: [],
  });
  const [deck, setDeck] = useState<Profile[]>([]);
  const [feedback, setFeedback] = useState('Swipe a profile');

  useEffect(() => {
    fetch(`${API_BASE}/api/profiles`)
      .then((res) => res.json())
      .then((data) => {
        setProfiles(data);
        setDeck(data.swipeDeck);
      })
      .catch(() => undefined);
  }, []);

  const current = useMemo(() => deck[0], [deck]);
  const nextCard = useMemo(() => deck[1], [deck]);

  const act = (decision: 'like' | 'skip') => {
    if (!current) return;
    setFeedback(decision === 'like' ? `Liked ${current.name}` : `Skipped ${current.name}`);
    setDeck((prev) => prev.slice(1));
  };

  return (
    <main className="pageShell">
      <div className="appFrame swipeFrame">
        <Sidebar
          titleLeft="TOP UŽÍVATELIA"
          titleRight="MOJE ZHODY"
          leftProfiles={profiles.topUsers}
          rightProfiles={profiles.matches}
        />

        <section className="mainStage swipeStage">
          <NavTabs active="swipe" />

          <div className="swipeBoard">
            <div className="swipeStack">
              {nextCard ? (
                <div className="swipeCard backCard">
                  <Image src={nextCard.image} alt={nextCard.name} fill sizes="50vw" className="coverImg" />
                </div>
              ) : null}

              {current ? (
                <div className="swipeCard frontCard">
                  <Image src={current.image} alt={current.name} fill sizes="50vw" className="coverImg" />
                  <div className="swipeOverlay">
                    <div>
                      <h2>{current.name}, {current.age}</h2>
                      <p>{current.city}</p>
                    </div>
                    <p className="swipeBio">{current.bio}</p>
                    <div className="tagsRow">
                      {current.tags.map((tag) => <span key={tag} className="tag">#{tag}</span>)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="emptyDeck">Deck is empty. Refresh profiles.</div>
              )}
            </div>

            <div className="swipeActions">
              <button className="bigAction likeBtn" onClick={() => act('like')}>LIKE 👍</button>
              <button className="bigAction skipBtn" onClick={() => act('skip')}>SKIP ⏩</button>
            </div>

            <div className="swipeFeedback">{feedback}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
