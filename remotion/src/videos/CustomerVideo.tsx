import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import { CusScene1Email, CUS_SCENE1_DURATION } from "../scenes/customer/Scene1Email";
import { CusScene2Land, CUS_SCENE2_DURATION } from "../scenes/customer/Scene2Land";
import { CusScene3Form, CUS_SCENE3_DURATION } from "../scenes/customer/Scene3Form";
import { CusScene4About, CUS_SCENE4_DURATION } from "../scenes/customer/Scene4About";
import { CusScene5Submit, CUS_SCENE5_DURATION } from "../scenes/customer/Scene5Submit";
import { CusScene6Thanks, CUS_SCENE6_DURATION } from "../scenes/customer/Scene6Thanks";

const TRANS = 16;
const N_TRANS = 5;

const TOTAL =
  CUS_SCENE1_DURATION + CUS_SCENE2_DURATION + CUS_SCENE3_DURATION + CUS_SCENE4_DURATION +
  CUS_SCENE5_DURATION + CUS_SCENE6_DURATION;

export const CUSTOMER_DURATION = TOTAL - TRANS * N_TRANS;

const slideRight = slide({ direction: "from-right" });
const slideTiming = springTiming({ config: { damping: 200 }, durationInFrames: TRANS });
const fadeTiming = linearTiming({ durationInFrames: TRANS });

export const CustomerVideo: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={CUS_SCENE1_DURATION}><CusScene1Email /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
      <TransitionSeries.Sequence durationInFrames={CUS_SCENE2_DURATION}><CusScene2Land /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={CUS_SCENE3_DURATION}><CusScene3Form /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={CUS_SCENE4_DURATION}><CusScene4About /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={CUS_SCENE5_DURATION}><CusScene5Submit /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
      <TransitionSeries.Sequence durationInFrames={CUS_SCENE6_DURATION}><CusScene6Thanks /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
