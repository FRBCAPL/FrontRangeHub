/** Featured clip + watch links — update here when promoting a new highlight. */
export const CUELESS_TAGLINE = 'Not Your Typical Pool Live Stream';

export const CUELESS_POSITIONING =
  'Cueless In The Booth is live pool entertainment — booth commentary, replay, telestration, and real personalities. Not just a stream.';

export const CUELESS_CARD_BLURB =
  'Broadcast-style production meets pool hall energy. Book at Legends Brews & Cues or bring us to your event.';

export const CUELESS_FEATURED_FACEBOOK_REEL =
  'https://www.facebook.com/reel/2530121504111414';

export const CUELESS_FEATURED_YOUTUBE_SHORT =
  'https://www.youtube.com/shorts/BndDv_0v3F4';

export const CUELESS_FEATURED_YOUTUBE_ID = 'BndDv_0v3F4';

export const CUELESS_DIFFERENTIATORS = [
  'Not your typical pool stream',
  'Live booth commentary with personality',
  'Instant replay & telestration',
  'Broadcast-style coverage, bar-room energy',
];

export function getCuelessFacebookEmbedUrl(
  reelUrl = CUELESS_FEATURED_FACEBOOK_REEL
) {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
    reelUrl
  )}&show_text=false&width=500`;
}

export function getCuelessYoutubeEmbedUrl(
  videoId = CUELESS_FEATURED_YOUTUBE_ID
) {
  return `https://www.youtube.com/embed/${videoId}`;
}
