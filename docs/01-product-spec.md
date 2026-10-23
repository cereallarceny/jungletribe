# Jungle Tribe - Product specification (MVP)

## Vision
A nationwide, two-sided marketplace for in-home plant care, paired with a completely free digital plant collection manager. Initial marketing targets serious and rare-houseplant collectors, starting in Nashville, with city-by-city expansion and optional city waitlists. No geographic product lockout.

## Actors
- Collector/customer: can use collections without booking; can book without cataloging plants.
- Sitter: verified individual with a public plant collection and selectable expertise.
- Admin: manages safety, users, bookings, disputes, moderation, and marketplace operations.

## Collections
- Unlimited free collections and plants, private by default for ordinary users.
- Multiple collections (e.g. greenhouse, living room), photos, acquired date, notes, genus/species, optional watering interval/instructions, and longitudinal photo timeline.
- AI-assisted plant identification from images with suggested genus/species, confidence/uncertainty, manual override; batch photo intake and review.
- Public collections share via web URL; mobile universal/app links open installed app, otherwise web with optional install prompt.
- Sitter collections must be public while offering sitting services. Privacy transition must be explicitly confirmed before sitter activation.
- No automated watering reminders, expert Q&A, or premium collection subscription in MVP.

## Sitter onboarding and trust
- Government ID and selfie/liveness match required before activation, via specialist provider; avoid storing raw IDs when feasible.
- Public documented plant collection required. Working proposal: 10 plants, subject to usability testing, not an established policy.
- Optional experience questions, specialties (orchids, anthuriums, monstera, pest treatment, etc.) and lightweight knowledge assessment as soft quality signals rather than hard exclusion.
- Auto-approve if hard checks pass; admin can suspend/review. Optional sitter-paid background checks, with clearly differentiated badge and modest ranking benefit, subject to provider and legal review.
- Reviews, collections and specialties appear on sitter profile. Do not imply ID checks certify expertise.

## Location and discovery
- Both parties enter an address, kept private and used for location matching. Sitter sets service radius and available windows.
- Customer service address is disclosed to selected sitter only after booking confirmation; sitter residential address is never shown to customer. Protect precise location in search responses and logs; use approximate public distance.
- Browse and filter sitters by geography, availability, services, specialties, price, reviews, and verification status. No bidding or automatic matching. Sponsored placement deferred.

## Availability and bookings
- Sitter defines recurring availability, blackout dates, lead time, visit capacity, time zone and morning/afternoon/evening windows.
- Customer specifies requested dates, per-visit duration (e.g. 30/60/120/240 minutes), accepted time windows (including anytime), and requested services: routine watering/care, maintenance, repotting, pest treatment, etc.
- Sitter publishes duration-based per-visit base rates and optional service add-ons; only offers services they support.
- One booking may contain multiple visits, with a single checkout. Exact arrival times can be negotiated in messages.
- Booking request addressed to a selected sitter; sitter can accept, decline or propose structured modifications. No instant booking in MVP.
- Customer can maintain up to three active booking-request conversations; no paid messaging tier. Rejected/expired requests free slots. Clarify expiry rules during technical planning.
- Messaging opens after request is sent, for access instructions and optional meet-and-greet arrangements. No separate lockbox module.
- After each visit prompt sitter for optional photo and notes; completion state tracked separately.

## Payments, cancellation and reviews
- Stripe Connect intended for marketplace charges and sitter payouts. Charge at acceptance for the whole booking; arrange payout after completed visits, subject to actual Stripe capabilities, payout timing, refunds, and regulatory review. Never promise escrow or unrestricted fund holding.
- Sitter selects flexible/moderate/strict cancellation policy; moderate default. Precise refund windows, partial booking refunds and payout reconciliation require policy design.
- Full refund when sitter cancels or qualifying failure is confirmed, subject to dispute rules and payment feasibility.
- Airbnb-inspired blind, two-way review process: 14 days after booking completion, one review per party per booking; reveal after both submit or period ends. Five-star + written feedback, photos; owner can rate quality, communication, reliability; sitter can rate instruction clarity, access and communication. Include moderation and review appeals.

## Insurance and claims
- Goal: optional third-party coverage for both rare-plant damage and accidental household damage, ideally one simple checkout choice.
- Do not activate or advertise coverage before a licensed insurance partner confirms policy wording, covered property, exclusions, valuation, claims handling, regulatory obligations and integration.
- Insurer handles coverage decisions and insurance claims; Jungle Tribe handles platform booking/refund disputes only. No platform guarantee of plant replacement or self-insurance in MVP.
- Investigate Cover Genius/XCover and Thimble, including partner/API availability and product fit; neither is yet confirmed to cover rare plants in this use case.

## Admin
- Admin authentication/authorization separated from consumer privileges; suspend sitters/users, moderate photos/reviews, inspect booking status, handle platform disputes and support requests, manage verification states and city campaigns.
- Record auditable actions and minimum necessary personal data.

## Core metrics
- Qualified sitters per active city, bookable sitter density, search-to-request, request-to-accept, acceptance-to-payment, completed bookings, repeat bookings, gross booking value, take rate, contribution margin, cancellations, disputes, incident rate, collection creation and collection-to-booking conversion.

## MVP exclusions
- Plant trading/sales, premium collections, expert forum, automatic watering notifications, sitter bidding, mandatory meet-and-greets, automatic booking, internal insurance underwriting, open developer API, sponsored rankings.

## Open policy questions
- Final cancellation windows; minimum sitter collection size; insurance partner; background-check geography/compliance; provider verification cost; exact Stripe funds flow; review moderation rules; sitter taxes and jurisdiction-specific obligations.
