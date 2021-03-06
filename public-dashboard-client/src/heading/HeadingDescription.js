import { mediaQuery } from "@w11r/use-breakpoint";
import styled from "styled-components";

const HeadingDescription = styled.div`
  font-size: 24px;
  min-height: 21vh;
  margin-top: 0;
  margin-bottom: 24px;

  ${mediaQuery(["mobile-", "font-size: 18px;"])}
`;

export default HeadingDescription;
