import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import { AgyScene1Hook, AGY_SCENE1_DURATION } from "../scenes/agency/Scene1Hook";
import { AgyScene2Signup, AGY_SCENE2_DURATION } from "../scenes/agency/Scene2Signup";
import { AgyScene3Dashboard, AGY_SCENE3_DURATION } from "../scenes/agency/Scene3Dashboard";
import { AgyScene4AddClient, AGY_SCENE4_DURATION } from "../scenes/agency/Scene4AddClient";
import { AgyScene5WorkAsClient, AGY_SCENE5_DURATION } from "../scenes/agency/Scene5WorkAsClient";
import { AgyScene6Report, AGY_SCENE6_DURATION } from "../scenes/agency/Scene6Report";
import { AgyScene7Portal, AGY_SCENE7_DURATION } from "../scenes/agency/Scene7Portal";
import { AgyScene8Outro, AGY_SCENE8_DURATION } from "../scenes/agency/Scene8Outro";

const TRANS = 16;
const N_TRANS = 7;

const TOTAL =
  AGY_SCENE1_DURATION + AGY_SCENE2_DURATION + AGY_SCENE3_DURATION + AGY_SCENE4_DURATION +
  AGY_SCENE5_DURATION + AGY_SCENE6_DURATION + AGY_SCENE7_DURATION + AGY_SCENE8_DURATION;

export const AGENCY_DURATION = TOTAL - TRANS * N_TRANS;

const slideRight = slide({ direction: "from-right" });
const slideTiming = springTiming({ config: { damping: 200 }, durationInFrames: TRANS });
const fadeTiming = linearTiming({ durationInFrames: TRANS });

export const AgencyVideo: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={AGY_SCENE1_DURATION}><AgyScene1Hook /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
      <TransitionSeries.Sequence durationInFrames={AGY_SCENE2_DURATION}><AgyScene2Signup /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={AGY_SCENE3_DURATION}><AgyScene3Dashboard /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={AGY_SCENE4_DURATION}><AgyScene4AddClient /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={AGY_SCENE5_DURATION}><AgyScene5WorkAsClient /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={AGY_SCENE6_DURATION}><AgyScene6Report /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={AGY_SCENE7_DURATION}><AgyScene7Portal /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
      <TransitionSeries.Sequence durationInFrames={AGY_SCENE8_DURATION}><AgyScene8Outro /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
