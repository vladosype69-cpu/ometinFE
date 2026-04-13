import Image from 'next/image';
import { Profile } from './types';

export default function Sidebar({ titleLeft, titleRight, leftProfiles, rightProfiles }: {
  titleLeft: string;
  titleRight: string;
  leftProfiles: Profile[];
  rightProfiles: Profile[];
}) {
  return (
    <aside className="sidebarPanel">
      <div className="sidebarTopBar">
        <div className="avatarBubble smallAvatar">U</div>
        <div className="circleIcon">📹</div>
        <div className="circleIcon">🎤</div>
        <div className="circleIcon">👍</div>
        <div className="circleIcon">⚙️</div>
      </div>

      <div className="sidebarHeaders">
        <span>{titleLeft}</span>
        <span>{titleRight}</span>
      </div>

      <div className="sidebarGridWrap">
        <div className="sidebarGrid">
          {leftProfiles.map((profile) => (
            <div key={profile.id} className="sidebarProfileCard">
              <Image src={profile.image} alt={profile.name} fill sizes="90px" className="coverImg" />
            </div>
          ))}
        </div>
        <div className="sidebarGrid">
          {rightProfiles.map((profile) => (
            <div key={profile.id} className="sidebarProfileCard">
              <Image src={profile.image} alt={profile.name} fill sizes="90px" className="coverImg" />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
