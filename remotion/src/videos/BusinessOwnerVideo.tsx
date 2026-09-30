import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import { Scene1Hook, SCENE1_HOOK_DURATION } from "../scenes/businessOwner/Scene1Hook";
import { Scene2Signup, SCENE2_SIGNUP_DURATION } from "../scenes/businessOwner/Scene2Signup";
import { Scene2bVerifyEmail, SCENE2B_VERIFY_DURATION } from "../scenes/businessOwner/Scene2bVerifyEmail";
import { Scene2cPickPlan, SCENE2C_PLAN_DURATION } from "../scenes/businessOwner/Scene2cPickPlan";
import { Scene3Connect, SCENE3_CONNECT_DURATION } from "../scenes/businessOwner/Scene3Connect";
import { Scene4Install, SCENE4_INSTALL_DURATION } from "../scenes/businessOwner/Scene4Install";
import { Scene5Widget, SCENE5_WIDGET_DURATION } from "../scenes/businessOwner/Scene5Widget";
import { Scene6Result, SCENE6_RESULT_DURATION } from "../scenes/businessOwner/Scene6Result";
import { Scene7Outro, SCENE7_OUTRO_DURATION } from "../scenes/businessOwner/Scene7Outro";

const TRANS = 16;
const N_TRANS = 8; // 9 scenes → 8 transitions

const SCENE_TOTAL =
  SCENE1_HOOK_DURATION +
  SCENE2_SIGNUP_DURATION +
  SCENE2B_VERIFY_DURATION +
  SCENE2C_PLAN_DURATION +
  SCENE3_CONNECT_DURATION +
  SCENE4_INSTALL_DURATION +
  SCENE5_WIDGET_DURATION +
  SCENE6_RESULT_DURATION +
  SCENE7_OUTRO_DURATION;

export const BUSINESS_OWNER_DURATION = SCENE_TOTAL - TRANS * N_TRANS;

const slideRight = slide({ direction: "from-right" });
const slideTiming = springTiming({ config: { damping: 200 }, durationInFrames: TRANS });
const fadeTiming = linearTiming({ durationInFrames: TRANS });

export const BusinessOwnerVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE1_HOOK_DURATION}>
          <Scene1Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

        <TransitionSeries.Sequence durationInFrames={SCENE2_SIGNUP_DURATION}>
          <Scene2Signup />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />

        <TransitionSeries.Sequence durationInFrames={SCENE2B_VERIFY_DURATION}>
          <Scene2bVerifyEmail />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />

        <TransitionSeries.Sequence durationInFrames={SCENE2C_PLAN_DURATION}>
          <Scene2cPickPlan />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />

        <TransitionSeries.Sequence durationInFrames={SCENE3_CONNECT_DURATION}>
          <Scene3Connect />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />

        <TransitionSeries.Sequence durationInFrames={SCENE4_INSTALL_DURATION}>
          <Scene4Install />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />

        <TransitionSeries.Sequence durationInFrames={SCENE5_WIDGET_DURATION}>
          <Scene5Widget />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />

        <TransitionSeries.Sequence durationInFrames={SCENE6_RESULT_DURATION}>
          <Scene6Result />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />

        <TransitionSeries.Sequence durationInFrames={SCENE7_OUTRO_DURATION}>
          <Scene7Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
