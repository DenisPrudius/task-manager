import pytest


@pytest.fixture
def project_id(auth_client):
    r = auth_client.post("/projects/", json={"name": "Work"})
    return r.json()["id"]


TASK = {"title": "Fix bug", "description": "Critical bug", "priority": "high"}


def test_create_task(auth_client, project_id):
    r = auth_client.post("/tasks/", json={**TASK, "project_id": project_id})
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == TASK["title"]
    assert body["status"] == "todo"
    assert body["priority"] == "high"


def test_list_project_tasks(auth_client, project_id):
    auth_client.post("/tasks/", json={**TASK, "project_id": project_id})
    auth_client.post("/tasks/", json={"title": "Another", "project_id": project_id})
    r = auth_client.get(f"/tasks/project/{project_id}")
    assert r.status_code == 200
    assert len(r.json()) == 2


def test_get_task(auth_client, project_id):
    task_id = auth_client.post(
        "/tasks/", json={**TASK, "project_id": project_id}
    ).json()["id"]
    r = auth_client.get(f"/tasks/{task_id}")
    assert r.status_code == 200
    assert r.json()["id"] == task_id


def test_get_task_not_found(auth_client):
    r = auth_client.get("/tasks/99999")
    assert r.status_code == 404


def test_update_task_status(auth_client, project_id):
    task_id = auth_client.post(
        "/tasks/", json={**TASK, "project_id": project_id}
    ).json()["id"]
    r = auth_client.patch(f"/tasks/{task_id}", json={"status": "in_progress"})
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


def test_delete_task(auth_client, project_id):
    task_id = auth_client.post(
        "/tasks/", json={**TASK, "project_id": project_id}
    ).json()["id"]
    r = auth_client.delete(f"/tasks/{task_id}")
    assert r.status_code == 204
    assert auth_client.get(f"/tasks/{task_id}").status_code == 404


def test_my_tasks(auth_client, project_id):
    # assign task to self
    user_id = auth_client.get("/users/me").json()["id"]
    auth_client.post(
        "/tasks/",
        json={**TASK, "project_id": project_id, "assignee_id": user_id},
    )
    r = auth_client.get("/tasks/my")
    assert r.status_code == 200
    assert len(r.json()) >= 1
