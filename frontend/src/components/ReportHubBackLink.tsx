import { Link } from "react-router-dom";

/** Back navigation from an individual report to the reports hub. */
export function ReportHubBackLink() {
  return (
    <Link to="/reports" className="grs-page-back" style={{ textDecoration: "none" }}>
      ← All reports
    </Link>
  );
}
