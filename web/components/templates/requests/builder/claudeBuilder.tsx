import { enforceString } from "../../../../lib/helpers/typeEnforcers";
import { Completion } from "./components/completion";
import AbstractRequestBuilder, {
  SpecificFields,
} from "./abstractRequestBuilder";

class ClaudeBuilder extends AbstractRequestBuilder {
  protected buildSpecific(): SpecificFields {
    const getResponseText = () => {
      const statusCode = this.response.response_status;
      if ([200, 201, -3].includes(statusCode)) {
        // successful response, check for an error from openai
        if (this.response.response_body?.error) {
          return this.response.response_body?.error?.message || "";
        }

        // Check for tool_use in the content array
        if (Array.isArray(this.response.response_body?.content)) {
          const toolUse = this.response.response_body.content.find(
            (item: any) => item.type === "tool_use"
          );
          if (toolUse) {
            return `${toolUse.name}(${JSON.stringify(toolUse.input)})`;
          }

          // If no tool_use, find the text content
          const textContent = this.response.response_body.content.find(
            (item: any) => item.type === "text"
          );
          if (textContent) {
            return textContent.text || "";
          }
        }

        // If no content array or no relevant items found, fall back to the original logic
        return this.response.response_body?.body
          ? this.response.response_body?.body?.completion ?? ""
          : this.response.response_body?.completion ?? "";
      } else if (statusCode === 0 || statusCode === null) {
        // pending response
        return "";
      } else {
        // network error
        return this.response.response_body?.error?.message || "";
      }
    };

    return {
      requestText: enforceString(
        this.response.request_body.tooLarge
          ? "Helicone Message: Input too large"
          : this.response.request_body.prompt ||
              this.response.request_body.messages?.slice(-1)?.[0]?.content ||
              ""
      ),
      responseText: getResponseText(),
      render: () => {
        return this.response.response_status === 0 ||
          this.response.response_status === null ? (
          <p>Pending...</p>
        ) : this.response.response_status === 200 ? (
          <Completion
            request={
              this.response.request_body.prompt ||
              this.response.request_body.messages?.slice(-1)?.[0]?.content ||
              ""
            }
            response={{
              title: "Response",
              text: getResponseText(),
            }}
            rawRequest={this.response.request_body}
            rawResponse={
              this.response.response_body?.body || this.response.response_body
            }
          />
        ) : (
          <Completion
            request={this.response.request_body.prompt || "n/a"}
            response={{
              title: "Error",
              text: this.response.response_body?.error?.message || "n/a",
            }}
            rawRequest={this.response.request_body}
            rawResponse={this.response.response_body}
          />
        );
      },
    };
  }
}

export default ClaudeBuilder;
