<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

const RECIPIENT = 'hello@studiorage.ch';
const SENDER = 'hello@studiorage.ch';

function respond(bool $ok, string $message, int $status = 200): never
{
    http_response_code($status);
    echo json_encode(
        ['ok' => $ok, 'message' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function field(string $name, int $maxLength, bool $required = false): string
{
    $value = $_POST[$name] ?? '';
    if (!is_string($value)) {
        $value = '';
    }

    $value = trim(str_replace(["\r\n", "\r"], "\n", $value));
    if (mb_strlen($value, 'UTF-8') > $maxLength) {
        $value = mb_substr($value, 0, $maxLength, 'UTF-8');
    }

    if ($required && $value === '') {
        throw new InvalidArgumentException($name);
    }

    return $value;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Method not allowed.', 405);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 100000) {
    respond(false, 'Request too large.', 413);
}

$language = (($_POST['language'] ?? '') === 'en') ? 'en' : 'fr';
$invalidMessage = $language === 'fr'
    ? "Vérifiez les champs obligatoires et le budget minimum de CHF 500."
    : 'Check the required fields and the minimum budget of CHF 500.';
$successMessage = $language === 'fr'
    ? 'Votre demande a bien été envoyée. Je vous répondrai dès que possible.'
    : 'Your enquiry has been sent. I will reply as soon as possible.';
$errorMessage = $language === 'fr'
    ? "L'envoi a échoué. Réessayez ou écrivez directement à hello@studiorage.ch."
    : 'The message could not be sent. Try again or email hello@studiorage.ch.';

try {
    // Honeypot: bots generally fill this hidden field.
    if (field('website', 200) !== '') {
        respond(true, $successMessage);
    }

    $name = field('name', 120, true);
    $company = field('company', 160);
    $email = field('email', 190, true);
    $phone = field('phone', 60);
    $service = field('service', 160, true);
    $budget = field('budget', 30, true);
    $timeline = field('timeline', 120);
    $source = field('source', 200);
    $description = field('description', 6000, true);
    $consent = isset($_POST['consent']) && (string) $_POST['consent'] === '1';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('email');
    }
    if (!$consent) {
        throw new InvalidArgumentException('consent');
    }
    if (!is_numeric($budget) || (float) $budget < 500) {
        throw new InvalidArgumentException('budget');
    }
} catch (InvalidArgumentException) {
    respond(false, $invalidMessage, 422);
}

$safeName = trim(preg_replace('/[\r\n]+/', ' ', $name) ?? '');
$safeEmail = trim(preg_replace('/[\r\n]+/', '', $email) ?? '');

$subjectText = 'Nouvelle demande Studio Rage - ' . $service . ' - ' . $safeName;
$subject = '=?UTF-8?B?' . base64_encode($subjectText) . '?=';

$body = "NOUVELLE DEMANDE STUDIO RAGE\n\n";
$body .= "Nom : {$name}\n";
$body .= "Entreprise ou projet : " . ($company !== '' ? $company : 'Non renseigné') . "\n";
$body .= "Email : {$email}\n";
$body .= "Téléphone : " . ($phone !== '' ? $phone : 'Non renseigné') . "\n";
$body .= "Prestation : {$service}\n";
$body .= "Budget indicatif : CHF " . number_format((float) $budget, 0, '.', "'") . "\n";
$body .= "Calendrier : " . ($timeline !== '' ? $timeline : 'Non renseigné') . "\n";
$body .= "Découverte de Studio Rage : " . ($source !== '' ? $source : 'Non renseigné') . "\n";
$body .= "Langue : " . strtoupper($language) . "\n\n";
$body .= "DESCRIPTION DU PROJET\n{$description}\n\n";
$body .= "Consentement à la politique de confidentialité : oui\n";
$body .= "Date : " . date('d.m.Y H:i:s T') . "\n";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: Studio Rage <' . SENDER . '>',
    'Reply-To: "' . addcslashes($safeName, '"\\') . '" <' . $safeEmail . '>',
    'X-Mailer: Studio-Rage-Contact/1.0'
];

$sent = @mail(
    RECIPIENT,
    $subject,
    $body,
    implode("\r\n", $headers),
    '-f' . SENDER
);

if (!$sent) {
    // Some hosting configurations reject the optional envelope-sender argument.
    $sent = @mail(
        RECIPIENT,
        $subject,
        $body,
        implode("\r\n", $headers)
    );
}

if (!$sent) {
    error_log('Studio Rage contact form: mail() returned false.');
    respond(false, $errorMessage, 500);
}

respond(true, $successMessage);
