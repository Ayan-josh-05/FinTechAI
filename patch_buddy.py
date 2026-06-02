import re

file_path = "backend/routes/querySearch/strategy_buddy.py"
with open(file_path, "r") as f:
    content = f.read()

# Replace _detect_choice to be safer and not rely solely on LLM
new_detect = """
def _detect_choice(chat_id: str, message: str) -> ChoiceResult:
    pending = _get_pending_strategies(chat_id)
    if not pending:
        return ChoiceResult(is_new_query=True)
    
    # 1. Fast path fallback: check if message is exactly a number
    m = message.strip()
    if m in ["1", "2", "3"]:
        idx = int(m) - 1
        if idx < len(pending):
            return ChoiceResult(chosen_id=pending[idx]["id"])

    if not LANGCHAIN_OK:
        return ChoiceResult(is_new_query=True)
        
    try:
        strat_lines = "\\n".join(
            f"  {s['id']}: {s['plain_title']} — {s['plain_description']}"
            for s in pending
        )
        structured = _choice_llm.with_structured_output(ChoiceResult)
        prompt = _CHOICE_PROMPT.format(strategies_text=strat_lines, user_message=message)
        result = structured.invoke(prompt)
        
        # Ensure chosen_id matches if they just returned a number
        if result.chosen_id and result.chosen_id.isdigit():
            idx = int(result.chosen_id) - 1
            if 0 <= idx < len(pending):
                result.chosen_id = pending[idx]["id"]
                
        return result
    except Exception as e:
        logger.warning("Choice detection failed: %s", e)
        # If it fails but has a number in it, guess
        m = re.search(r'\\b([123])\\b', message)
        if m:
            idx = int(m.group(1)) - 1
            if 0 <= idx < len(pending):
                return ChoiceResult(chosen_id=pending[idx]["id"])
        return ChoiceResult(is_new_query=True)
"""

content = re.sub(r'def _detect_choice\(chat_id: str, message: str\) -> ChoiceResult:.*?return ChoiceResult\(is_new_query=True\)', new_detect.strip(), content, flags=re.DOTALL)


# Also fix the orchestrator to not fall through blindly
new_pipeline = """
    if pending:
        yield _thinking("Understanding your choice…")
        choice = _detect_choice(chat_id, query)

        if choice.wants_more_cases:
            _increment_scout_page(chat_id)
            yield _thinking("Looking for more options…")
            # Fall through to re-plan below
        elif not choice.is_new_query:
            strat = next((s for s in pending if s.get("id") == choice.chosen_id), None)
            if strat:
                yield from _execute_strategy(db, chat_id, query, strat, shared)
                return
            else:
                msg = "I didn't quite catch which option you meant. Please reply with 1, 2, or 3."
                yield _response_token(msg)
                # Keep the same phase=plan so they can try again next turn
                _save_turn(chat_id, user=query, assistant=msg, phase="plan", strategies=pending)
                shared["answer"] = msg
                return
        
        # is_new_query or fallthrough: re-plan from scratch
        _reset_scout_page(chat_id)
"""

content = re.sub(r'    if pending:.*?_reset_scout_page\(chat_id\)', new_pipeline.strip(), content, flags=re.DOTALL)


with open(file_path, "w") as f:
    f.write(content)

