
import React, { useMemo, useState } from 'react';
import {
  Form,
  Button,
  Row,
  Col,
  InputGroup,
  Badge,
  Stack,
  Alert,
  Card,
} from 'react-bootstrap';

/** Rating scale (1–5) with concise labels */
function RatingScale({ id, label, value, onChange }) {
  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
  return (
    <Form.Group controlId={id} className="mb-3">
      <Form.Label className="fw-semibold">{label}</Form.Label>
      <div role="group" aria-labelledby={id}>
        <Stack direction="horizontal" gap={2} className="flex-wrap">
          {labels.map((lbl, idx) => {
            const score = idx + 1;
            return (
              <Form.Check
                key={`${id}-${score}`}
                inline
                type="radio"
                name={id}
                id={`${id}-${score}`}
                label={lbl}
                checked={value === score}
                onChange={() => onChange(score)}
              />
            );
          })}
        </Stack>
      </div>
    </Form.Group>
  );
}

/** Checkbox grid */
function CheckboxGrid({ idPrefix, options, selected, onToggle }) {
  return (
    <Row xs={1} sm={2} md={3} className="g-2">
      {options.map((opt) => (
        <Col key={opt}>
          <Form.Check
            type="checkbox"
            id={`${idPrefix}-${opt}`}
            label={opt}
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
          />
        </Col>
      ))}
    </Row>
  );
}

export default function SeasonalServiceFeedbackForm({ onSubmit }) {
  // 🔧 Edit this list to match your business
  const serviceOptions = useMemo(
    () => [
      'Lawn Care',
      'Snow Removal',
      'Gutter Cleaning',
      'Tree Trimming',
      'Power Washing',
      'Landscape Design',
      'Other',
    ],
    []
  );

  const initial = {
    clientName: '',
    servicesUsed: [],
    ratings: {
      quality: 0,
      professionalism: 0,
      schedulingEase: 0,
      paymentEase: 0,
      costSatisfaction: 0,
      timelinessHours: '',
      serviceCount: '',
    },
    likesMost: '',
    improveNextYear: '',
    otherComments: '',
    continueServices: 'yes', // 'yes' | 'unsure' | 'no'
    discontinueReason: '',
    canEarnBack: '',
    newServicesWishList: '',
  };

  const [form, setForm] = useState(initial);
  const [validated, setValidated] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Minimal helpers
  const update = (path, value) => {
    setForm((prev) => {
      const keys = path.split('.');
      const draft = { ...prev };
      let cursor = draft;
      for (let i = 0; i < keys.length - 1; i++) {
        cursor[keys[i]] = { ...cursor[keys[i]] };
        cursor = cursor[keys[i]];
      }
      cursor[keys.at(-1)] = value;
      return draft;
    });
  };

  const toggleService = (svc) => {
    setForm((prev) => {
      const set = new Set(prev.servicesUsed);
      set.has(svc) ? set.delete(svc) : set.add(svc);
      return { ...prev, servicesUsed: Array.from(set) };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidated(true);

    if (form.servicesUsed.length === 0) return; // require at least one service

    setSubmitted(true);
    onSubmit?.(form);
  };

  const resetForm = () => {
    setForm(initial);
    setValidated(false);
    setSubmitted(false);
  };

  return (
    <Form noValidate validated={validated} onSubmit={handleSubmit} className="p-3">
      <Card className="mb-4 shadow-sm border-0">
        <Card.Body>
          <Card.Title as="h4" className="mb-2">Seasonal Services Feedback</Card.Title>
          <Card.Subtitle className="text-muted">
            Quick survey (~2–3 minutes) to help us improve next season.
          </Card.Subtitle>
        </Card.Body>
      </Card>

      {/* Client Info */}
      <section className="mb-4">
        <h6 className="text-uppercase text-muted mb-2">Client Info</h6>
        <Form.Group controlId="clientName">
          <Form.Label>Client Name <span className="text-muted">(optional)</span></Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g., Jane Doe"
            value={form.clientName}
            onChange={(e) => update('clientName', e.target.value)}
          />
        </Form.Group>
      </section>

      {/* Services Used */}
      <section className="mb-4">
        <div className="d-flex align-items-center gap-2 mb-2">
          <h6 className="text-uppercase text-muted mb-0">Services Used</h6>
          <Badge bg="secondary">Required</Badge>
        </div>
        <CheckboxGrid
          idPrefix="svc"
          options={serviceOptions}
          selected={form.servicesUsed}
          onToggle={toggleService}
        />
        {validated && form.servicesUsed.length === 0 && (
          <div className="invalid-feedback d-block">Please select at least one service.</div>
        )}
      </section>

      {/* Experience */}
      <section className="mb-4">
        <h6 className="text-uppercase text-muted mb-2">Your Experience</h6>
        <Row>
          <Col md={6}>
            <RatingScale
              id="quality"
              label="Quality"
              value={form.ratings.quality}
              onChange={(v) => update('ratings.quality', v)}
            />
          </Col>
          <Col md={6}>
            <RatingScale
              id="professionalism"
              label="Professionalism"
              value={form.ratings.professionalism}
              onChange={(v) => update('ratings.professionalism', v)}
            />
          </Col>
          <Col md={6}>
            <RatingScale
              id="schedulingEase"
              label="Ease of Scheduling"
              value={form.ratings.schedulingEase}
              onChange={(v) => update('ratings.schedulingEase', v)}
            />
          </Col>
          <Col md={6}>
            <RatingScale
              id="paymentEase"
              label="Ease of Payment"
              value={form.ratings.paymentEase}
              onChange={(v) => update('ratings.paymentEase', v)}
            />
          </Col>
          <Col md={6}>
            <RatingScale
              id="costSatisfaction"
              label="Cost Satisfaction"
              value={form.ratings.costSatisfaction}
              onChange={(v) => update('ratings.costSatisfaction', v)}
            />
          </Col>

          <Col md={6} className="mb-3">
            <Form.Label className="fw-semibold">Timeliness (hours to completion)</Form.Label>
            <InputGroup>
              <Form.Control
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g., 6"
                value={form.ratings.timelinessHours}
                onChange={(e) => update('ratings.timelinessHours', e.target.value)}
              />
              <InputGroup.Text>hours</InputGroup.Text>
            </InputGroup>
            <Form.Text className="text-muted">
              Approximate total hours to complete your service(s).
            </Form.Text>
          </Col>

          <Col md={6} className="mb-3">
            <Form.Label className="fw-semibold">Service Count</Form.Label>
            <InputGroup>
              <Form.Control
                type="number"
                min="0"
                step="1"
                placeholder="e.g., 3"
                value={form.ratings.serviceCount}
                onChange={(e) => update('ratings.serviceCount', e.target.value)}
              />
              <InputGroup.Text>tasks</InputGroup.Text>
            </InputGroup>
          </Col>
        </Row>
      </section>

      {/* Open Feedback */}
      <section className="mb-4">
        <h6 className="text-uppercase text-muted mb-2">Open Feedback</h6>
        <Form.Group className="mb-3" controlId="likesMost">
          <Form.Label className="fw-semibold">What did you like most?</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Tell us what stood out positively…"
            value={form.likesMost}
            onChange={(e) => update('likesMost', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="improveNextYear">
          <Form.Label className="fw-semibold">What could we improve for next season?</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Suggestions help us get better…"
            value={form.improveNextYear}
            onChange={(e) => update('improveNextYear', e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="otherComments">
          <Form.Label className="fw-semibold">Other comments</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Anything else we should know?"
            value={form.otherComments}
            onChange={(e) => update('otherComments', e.target.value)}
          />
        </Form.Group>
      </section>

      {/* Next Season */}
      <section className="mb-4">
        <h6 className="text-uppercase text-muted mb-2">Next Season</h6>
        <Form.Group className="mb-3" controlId="continueServices">
          <Form.Label className="fw-semibold">Continue services next season?</Form.Label>
          <Stack direction="horizontal" gap={3} className="flex-wrap">
            {['yes', 'unsure', 'no'].map((val) => (
              <Form.Check
                key={val}
                type="radio"
                inline
                name="continueServices"
                id={`continue-${val}`}
                label={val[0].toUpperCase() + val.slice(1)}
                checked={form.continueServices === val}
                onChange={() => update('continueServices', val)}
              />
            ))}
          </Stack>
        </Form.Group>

        {form.continueServices === 'no' && (
          <Row className="gy-3">
            <Col md={6}>
              <Form.Group controlId="discontinueReason">
                <Form.Label className="fw-semibold">If no, why?</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Share your reason for discontinuing…"
                  value={form.discontinueReason}
                  onChange={(e) => update('discontinueReason', e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group controlId="canEarnBack">
                <Form.Label className="fw-semibold">Can we earn back your business? How?</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="What would change your mind?"
                  value={form.canEarnBack}
                  onChange={(e) => update('canEarnBack', e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        )}

        <Form.Group className="mt-3" controlId="newServicesWishList">
          <Form.Label className="fw-semibold">Any services you’d like us to offer next season?</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="e.g., irrigation setup, holiday lighting, pest control…"
            value={form.newServicesWishList}
            onChange={(e) => update('newServicesWishList', e.target.value)}
          />
        </Form.Group>
      </section>

      {submitted && (
        <Alert variant="success" className="mb-3">
          Thanks for your feedback! We’ve recorded your responses.
        </Alert>
      )}

      <div className="d-flex gap-2">
        <Button type="submit" variant="primary">Submit Feedback</Button>
        <Button type="button" variant="outline-secondary" onClick={resetForm}>
          Reset
        </Button>
      </div>
    </Form>
  );
}
