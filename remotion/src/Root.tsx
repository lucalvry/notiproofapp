import { Composition } from "remotion";
import { BusinessOwnerVideo, BUSINESS_OWNER_DURATION } from "./videos/BusinessOwnerVideo";
import { MarketerVideo, MARKETER_DURATION } from "./videos/MarketerVideo";
import { AgencyVideo, AGENCY_DURATION } from "./videos/AgencyVideo";
import { CustomerVideo, CUSTOMER_DURATION } from "./videos/CustomerVideo";

export const RemotionRoot = () => (
  <>
    <Composition id="businessOwner" component={BusinessOwnerVideo} durationInFrames={BUSINESS_OWNER_DURATION} fps={30} width={1920} height={1080} />
    <Composition id="marketer" component={MarketerVideo} durationInFrames={MARKETER_DURATION} fps={30} width={1920} height={1080} />
    <Composition id="agency" component={AgencyVideo} durationInFrames={AGENCY_DURATION} fps={30} width={1920} height={1080} />
    <Composition id="customer" component={CustomerVideo} durationInFrames={CUSTOMER_DURATION} fps={30} width={1920} height={1080} />
  </>
);
