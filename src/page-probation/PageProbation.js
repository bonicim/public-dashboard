import React from "react";
import DetailPage from "../detail-page";

const TITLE = "Probation";
const DESCRIPTION = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.
  Vestibulum in finibus tellus, et ullamcorper augue. Quisque eleifend
  tortor vitae iaculis egestas. Donec dictum, nunc nec tincidunt cursus,
  ipsum dui gravida.`;

export default function PageProbation() {
  return <DetailPage title={TITLE} description={DESCRIPTION} />;
}