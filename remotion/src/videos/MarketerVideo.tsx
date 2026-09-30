import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";

import { MktScene1Hook, MKT_SCENE1_DURATION } from "../scenes/marketer/Scene1Hook";
import { MktScene2Approve, MKT_SCENE2_DURATION } from "../scenes/marketer/Scene2Approve";
import { MktScene3Generate, MKT_SCENE3_DURATION } from "../scenes/marketer/Scene3Generate";
import { MktScene4Bulk, MKT_SCENE4_DURATION } from "../scenes/marketer/Scene4Bulk";
import { MktScene5Publish, MKT_SCENE5_DURATION } from "../scenes/marketer/Scene5Publish";
import { MktScene6CaseStudy, MKT_SCENE6_DURATION } from "../scenes/marketer/Scene6CaseStudy";
import { MktScene7Outro, MKT_SCENE7_DURATION } from "../scenes/marketer/Scene7Outro";

const TRANS = 16;
const N_TRANS = 6;

const TOTAL =
  MKT_SCENE1_DURATION + MKT_SCENE2_DURATION + MKT_SCENE3_DURATION + MKT_SCENE4_DURATION +
  MKT_SCENE5_DURATION + MKT_SCENE6_DURATION + MKT_SCENE7_DURATION;

export const MARKETER_DURATION = TOTAL - TRANS * N_TRANS;

const slideRight = slide({ direction: "from-right" });
const slideTiming = springTiming({ config: { damping: 200 }, durationInFrames: TRANS });
const fadeTiming = linearTiming({ durationInFrames: TRANS });

export const MarketerVideo: React.FC = () => (
  <AbsoluteFill>
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={MKT_SCENE1_DURATION}><MktScene1Hook /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
      <TransitionSeries.Sequence durationInFrames={MKT_SCENE2_DURATION}><MktScene2Approve /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={MKT_SCENE3_DURATION}><MktScene3Generate /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={MKT_SCENE4_DURATION}><MktScene4Bulk /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={MKT_SCENE5_DURATION}><MktScene5Publish /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={slideRight} timing={slideTiming} />
      <TransitionSeries.Sequence durationInFrames={MKT_SCENE6_DURATION}><MktScene6CaseStudy /></TransitionSeries.Sequence>
      <TransitionSeries.Transition presentation={fade()} timing={fadeTiming} />
      <TransitionSeries.Sequence durationInFrames={MKT_SCENE7_DURATION}><MktScene7Outro /></TransitionSeries.Sequence>
    </TransitionSeries>
  </AbsoluteFill>
);
