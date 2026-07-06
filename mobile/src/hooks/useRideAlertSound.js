import { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';

const RING_SOURCE = require('../../assets/sounds/incoming-ride.wav');

// Loops a ring tone while `active` is true (a new ride request is waiting for
// a response) so the driver notices even if they're not looking at the
// screen - a single notification "ding" is easy to miss while driving.
export default function useRideAlertSound(active) {
  const player = useAudioPlayer(RING_SOURCE);

  useEffect(() => {
    player.loop = true;
  }, [player]);

  useEffect(() => {
    if (active) {
      player.seekTo(0);
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);
}
